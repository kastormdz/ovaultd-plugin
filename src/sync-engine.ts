/**
 * MotorDeSync — el núcleo durable de ovaultd corriendo DENTRO del renderer de Obsidian,
 * sin puentes: el puerto de archivos es `AdaptadorDeArchivos` (API del vault) y el estado
 * durable es el `StateStore` (IndexedDB del renderer). Mismo motor que el CLI.
 *
 * Ciclo de vida:
 *  - `vincular()`: signin → material del vault (`GET /vaults/{id}/material`) → password
 *    LOCAL del vault → KEK → unwrap → subclaves. Persiste lo necesario en
 *    `estado-local.json` (junto al plugin) — NUNCA en `data.json`: cuando llegue la lista
 *    blanca de configuración sincronizable, data.json es candidato a viajar y esto no.
 *  - `iniciar()`: abre el store, recupera intenciones pendientes (journal) y abre la
 *    `SyncConnection`; deja un ciclo de asentamiento agendado.
 *  - `marcarSucio()`: los cambios coalescidos del puente piden un ciclo con debounce
 *    global (1,5 s de quietud) y LOCK: un solo ciclo a la vez; si llegan cambios mientras
 *    corre, se repite una pasada más (el pull converge).
 *  - Conflicto ⇒ `con-conflictos` visible, estado consistente; los cambios locales quedan
 *    en la outbox (save-first). Nada se pierde.
 */

import type { App } from 'obsidian';

import {
  cabeceraCliente,
  evaluarCompatibilidad,
  type MetaDelServer,
  type Veredicto,
} from './compat';
import { ventana } from './entorno';
import { dirDelPlugin } from './rutas';

import {
  StateStore,
  SyncConnection,
  correrCiclo,
  recoverApplies,
  resolverBloqueado,
  type EleccionDeResolucion,
  type FileSystemPort,
  type IntentEntry,
  type SyncCycleReport,
} from '@ovaultd/core';
import {
  KDF_DEFAULTS,
  deriveKek,
  deriveKekRecovery,
  deriveSubkeys,
  identityFromSubkeys,
  randomRecoverySecret,
  randomSalt,
  randomVaultKey,
  randomVaultUuid,
  unwrapKeyPw,
  unwrapKeyRc,
  wrapKeyPw,
  wrapKeyRc,
  type KdfParams,
  type SubKeys,
} from '@ovaultd/crypto';
import {
  b64Decode,
  b64Encode,
  fromHex,
  toHex,
  type CreateVaultWire,
  type VaultMaterial,
  type VaultSummary,
} from '@ovaultd/protocol';

import { AdaptadorDeArchivos } from './ObsidianFileAdapter';

/**
 * Nombre de la base IndexedDB del índice durable. VA POR VAULT a propósito: IndexedDB es por
 * ORIGEN de la app, no por vault, así que con un nombre fijo dos vaults del mismo Obsidian
 * comparten el índice — el motor encolaba con el `expectedRev` del otro vault y el servidor
 * rechazaba por conflicto (rev 23 contra head 0, visto con el primer vault real).
 */
export const nombreDeIndice = (vaultUuidB64: string): string => `ovaultd-indice-${vaultUuidB64}`;
const LOG_MAX_BYTES = 64 * 1024;
const DEBOUNCE_MS = 1500;
const ASENTAMIENTO_MS = 3000;

export interface SubclavesEnHex {
  content: string;
  nonce: string;
  path: string;
  meta: string;
  bind: string;
  sign: string;
}

export interface EstadoLocalDelPlugin {
  serverUrl: string;
  cuenta: { email: string; token: string; deviceId: number };
  vault: {
    numero: number;
    nombre: string;
    vaultUuidB64: string;
    epoch: number;
    subclaves: SubclavesEnHex;
  };
}

/**
 * Sesión de CUENTA (independiente del vault): se loguea una vez y las operaciones de
 * cuenta (listar/crear/borrar vaults) la reusan. Sobrevive al desvínculo de un vault.
 */
export interface SesionDeCuenta {
  serverUrl: string;
  email: string;
  token: string;
  deviceId: number;
}

export type FaseDelMotor = 'apagado' | 'sincronizando' | 'al-dia' | 'con-conflictos' | 'error';

export interface EstadoDelMotor {
  fase: FaseDelMotor;
  detalle: string;
  ultimaSync: number | null;
  ultimoReporte: SyncCycleReport | null;
}

const normalizarServer = (servidor: string): string => {
  let out = servidor.trim();
  if (!/^https?:\/\//i.test(out)) out = `http://${out}`;
  return out.replace(/\/+$/, '');
};

const subclavesAHex = (subkeys: SubKeys): SubclavesEnHex => ({
  content: toHex(subkeys.content),
  nonce: toHex(subkeys.nonce),
  path: toHex(subkeys.path),
  meta: toHex(subkeys.meta),
  bind: toHex(subkeys.bind),
  sign: toHex(subkeys.sign),
});

const subclavesDeHex = (hex: SubclavesEnHex): SubKeys =>
  ({
    content: fromHex(hex.content),
    nonce: fromHex(hex.nonce),
    path: fromHex(hex.path),
    meta: fromHex(hex.meta),
    bind: fromHex(hex.bind),
    sign: fromHex(hex.sign),
  });

/** Borra la DB del índice del motor; inofensivo fuera del renderer (tests). */
function borrarIndiceDurable(vaultUuidB64: string): Promise<void> {
  if (typeof indexedDB === 'undefined') return Promise.resolve();
  return new Promise((listo) => {
    const pedido = indexedDB.deleteDatabase(nombreDeIndice(vaultUuidB64));
    pedido.onsuccess = () => listo();
    pedido.onerror = () => listo();
    pedido.onblocked = () => listo(); // una conexión colgada no debe frenar el desvínculo
  });
}

export class MotorDeSync {
  private store: StateStore | null = null;
  private conn: SyncConnection | null = null;
  private port: FileSystemPort | null = null;
  private keys: SubKeys | null = null;
  private vaultUuidBytes: Uint8Array | null = null;

  private estadoLocal: EstadoLocalDelPlugin | null = null;
  private sesion: SesionDeCuenta | null = null;
  private corriendo = false;
  private sucio = false;
  private timerPendiente: number | null = null;
  private iniciando = false;

  /** Veredicto de `/meta` (ADR-0018). Se consulta una vez por sesión, no por ciclo. */
  private compat: Veredicto | null = null;

  estado: EstadoDelMotor = { fase: 'apagado', detalle: 'sin vincular', ultimaSync: null, ultimoReporte: null };

  constructor(
    private readonly app: App,
    private readonly avisar: (estado: EstadoDelMotor) => void,
    private readonly versionPropia: string,
  ) {}

  // ------------------------------------------------------------------ rutas locales

  /** El `configDir` lo elige el usuario: las rutas se derivan de él, nunca de `.obsidian`. */
  private get rutaEstado(): string {
    return `${dirDelPlugin(this.app)}/estado-local.json`;
  }

  private get rutaSesion(): string {
    return `${dirDelPlugin(this.app)}/sesion-cuenta.json`;
  }

  private get rutaLog(): string {
    return `${dirDelPlugin(this.app)}/motor.log`;
  }

  // ------------------------------------------------------------------ estado local

  async leerEstadoLocal(): Promise<EstadoLocalDelPlugin | null> {
    try {
      const crudo = await this.app.vault.adapter.read(this.rutaEstado);
      return JSON.parse(crudo) as EstadoLocalDelPlugin;
    } catch {
      return null;
    }
  }

  private async guardarEstadoLocal(estado: EstadoLocalDelPlugin): Promise<void> {
    await this.app.vault.adapter.write(this.rutaEstado, `${JSON.stringify(estado, null, 2)}\n`);
  }

  // ------------------------------------------------------------------ sesión de cuenta

  async leerSesion(): Promise<SesionDeCuenta | null> {
    if (this.sesion !== null) return this.sesion;
    try {
      const crudo = await this.app.vault.adapter.read(this.rutaSesion);
      this.sesion = JSON.parse(crudo) as SesionDeCuenta;
      return this.sesion;
    } catch {
      // Migración suave: un vínculo anterior trae la cuenta adentro del estado local.
      const local = this.estadoLocal ?? (await this.leerEstadoLocal());
      if (local !== null) {
        this.sesion = {
          serverUrl: local.serverUrl,
          email: local.cuenta.email,
          token: local.cuenta.token,
          deviceId: local.cuenta.deviceId,
        };
        return this.sesion;
      }
      return null;
    }
  }

  private async guardarSesion(sesion: SesionDeCuenta): Promise<void> {
    this.sesion = sesion;
    await this.app.vault.adapter.write(this.rutaSesion, `${JSON.stringify(sesion, null, 2)}\n`);
  }

  get cuentaConectada(): SesionDeCuenta | null {
    return this.sesion;
  }

  /** Login de cuenta UNA vez: el device queda ligado a la cuenta (no a un vault). */
  async entrar(opciones: {
    serverUrl: string;
    email: string;
    passwordCuenta: string;
  }): Promise<string> {
    const base = normalizarServer(opciones.serverUrl);
    const ses = await this.pedirJson<{ token: string; device_id: number }>(
      `${base}/api/v1/auth/signin`,
      {
        metodo: 'POST',
        cuerpo: {
          email: opciones.email,
          password: opciones.passwordCuenta,
          name: 'obsidian',
          platform: 'obsidian',
        },
      },
    );
    await this.guardarSesion({
      serverUrl: base,
      email: opciones.email,
      token: ses.token,
      deviceId: ses.device_id,
    });
    return `conectado como ${opciones.email} en ${base}`;
  }

  async salir(): Promise<void> {
    this.sesion = null;
    await this.app.vault.adapter.remove(this.rutaSesion).catch(() => undefined);
  }

  /** Los vaults de la cuenta (con la sesión): lista para vincular/crear/borrar. */
  async listarVaultsDeLaCuenta(): Promise<VaultSummary[]> {
    const sesion = await this.leerSesion();
    if (sesion === null) throw new Error('primero entrá con tu cuenta');
    return this.pedirJson<VaultSummary[]>(`${sesion.serverUrl}/api/v1/vaults`, {
      token: sesion.token,
    });
  }

  /**
   * Consulta `/api/v1/meta` y decide si este plugin puede trabajar contra el server
   * (ADR-0018). Se cachea por sesión (`forzar` para re-consultar, p. ej. tras entrar con
   * otra cuenta). Lanza solo si no hay sesión o si el server no contesta: un veredicto
   * negativo vuelve en `ok: false` con el mensaje ya redactado.
   */
  async compatibilidad(forzar = false): Promise<Veredicto> {
    if (this.compat !== null && !forzar) return this.compat;
    const sesion = await this.leerSesion();
    if (sesion === null) throw new Error('primero entrá con tu cuenta (Ajustes → Cuenta)');

    const respuesta = await fetch(`${sesion.serverUrl}/api/v1/meta`, {
      headers: { ...cabeceraCliente(this.versionPropia) },
      cache: 'no-store',
    });
    if (!respuesta.ok) {
      throw new Error(`GET /api/v1/meta → HTTP ${respuesta.status}: ${await respuesta.text()}`);
    }
    const veredicto = evaluarCompatibilidad(
      this.versionPropia,
      (await respuesta.json()) as MetaDelServer,
    );
    this.compat = veredicto;
    return veredicto;
  }

  /** Pedido sin parseo de body (los 204 y los PUT de material no traen JSON útil). */
  private async pedirRaw(
    ruta: string,
    opciones: { metodo?: string; token?: string; cuerpo?: unknown } = {},
  ): Promise<Response> {
    const headers: Record<string, string> = { ...cabeceraCliente(this.versionPropia) };
    if (opciones.token !== undefined) headers.authorization = `Bearer ${opciones.token}`;
    if (opciones.cuerpo !== undefined) headers['content-type'] = 'application/json';

    const respuesta = await fetch(ruta, {
      method: opciones.metodo ?? 'GET',
      headers,
      body: opciones.cuerpo === undefined ? undefined : JSON.stringify(opciones.cuerpo),
    });
    if (!respuesta.ok) {
      throw new Error(`${opciones.metodo ?? 'GET'} ${ruta} → HTTP ${respuesta.status}: ${await respuesta.text()}`);
    }
    return respuesta;
  }

  /** Sube la envuelta nueva de la password (re-sellado: recovery o cambio de password). */
  private async actualizarEnvueltaPassword(
    base: string,
    token: string,
    numeroVault: number,
    wrappedPw: Uint8Array,
  ): Promise<void> {
    await this.pedirRaw(`${base}/api/v1/vaults/${numeroVault}/material`, {
      metodo: 'PUT',
      token,
      cuerpo: { wrapped_key_pw: b64Encode(wrappedPw) },
    });
  }

  /** Borra un vault de la cuenta (confirmación fuerte: el nombre exacto). */
  async borrarVault(numeroVault: number, nombreConfirmado: string): Promise<void> {
    const sesion = await this.leerSesion();
    if (sesion === null) throw new Error('primero entrá con tu cuenta');

    await this.pedirRaw(
      `${sesion.serverUrl}/api/v1/vaults/${numeroVault}?confirm=${encodeURIComponent(nombreConfirmado)}`,
      { metodo: 'DELETE', token: sesion.token },
    );

    // Si era el vault de esta carpeta, se suelta el vínculo local (los archivos no se tocan).
    if (this.estadoLocal !== null && this.estadoLocal.vault.numero === numeroVault) {
      await this.desvincular();
    }
  }

  /**
   * Recupera el acceso con la recovery key y define una password nueva: abre la envuelta de
   * recovery, re-sella la envuelta de password y vincula la carpeta con la password nueva.
   */
  async recuperarVault(opciones: {
    numeroVault: number;
    recoveryHex: string;
    passwordNueva: string;
  }): Promise<string> {
    const sesion = await this.leerSesion();
    if (sesion === null) throw new Error('primero entrá con tu cuenta (Ajustes → Cuenta)');
    const base = sesion.serverUrl;
    this.fijarEstado('sincronizando', 'recuperando acceso…');

    const material = await this.pedirJson<VaultMaterial>(
      `${base}/api/v1/vaults/${opciones.numeroVault}/material`,
      { token: sesion.token },
    );
    if (material.vault_id === null) {
      throw new Error('el vault no tiene vault_id: material incompleto');
    }

    const salt = b64Decode(material.salt);
    const vaultUuid = b64Decode(material.vault_id);
    const recoverySecret = fromHex(opciones.recoveryHex.trim().toLowerCase());
    if (recoverySecret.length !== 32) {
      throw new Error('la recovery key tiene que ser 64 caracteres hexadecimales');
    }

    let vaultKey: Uint8Array;
    try {
      const kekRecovery = deriveKekRecovery(recoverySecret, salt);
      vaultKey = unwrapKeyRc(b64Decode(material.wrapped_key_rc), kekRecovery, vaultUuid);
    } catch {
      throw new Error('esa recovery key no abre este vault');
    }

    const kekNueva = deriveKek(
      opciones.passwordNueva,
      salt,
      JSON.parse(material.kdf_params) as KdfParams,
    );
    const wrappedPw = wrapKeyPw(vaultKey, kekNueva, vaultUuid, salt);
    await this.actualizarEnvueltaPassword(base, sesion.token, opciones.numeroVault, wrappedPw);

    // De acá en más es un vínculo normal con la password nueva.
    return this.vincular({ numeroVault: opciones.numeroVault, passwordVault: opciones.passwordNueva });
  }

  /**
   * Cambia la password del vault (validando la actual): re-sella la envuelta. La vault_key
   * no cambia, así que el vínculo local (si existe) sigue siendo válido.
   */
  async cambiarPasswordVault(opciones: {
    numeroVault: number;
    passwordActual: string;
    passwordNueva: string;
  }): Promise<void> {
    const sesion = await this.leerSesion();
    if (sesion === null) throw new Error('primero entrá con tu cuenta (Ajustes → Cuenta)');
    const base = sesion.serverUrl;
    this.fijarEstado('sincronizando', 'cambiando la password del vault…');

    const material = await this.pedirJson<VaultMaterial>(
      `${base}/api/v1/vaults/${opciones.numeroVault}/material`,
      { token: sesion.token },
    );
    if (material.vault_id === null) {
      throw new Error('el vault no tiene vault_id: material incompleto');
    }

    const salt = b64Decode(material.salt);
    const vaultUuid = b64Decode(material.vault_id);
    const kekActual = deriveKek(opciones.passwordActual, salt);

    let vaultKey: Uint8Array;
    try {
      vaultKey = unwrapKeyPw(b64Decode(material.wrapped_key_pw), kekActual, vaultUuid, salt);
    } catch {
      throw new Error('la password actual no abre este vault');
    }

    const kekNueva = deriveKek(
      opciones.passwordNueva,
      salt,
      JSON.parse(material.kdf_params) as KdfParams,
    );
    const wrappedPw = wrapKeyPw(vaultKey, kekNueva, vaultUuid, salt);
    await this.actualizarEnvueltaPassword(base, sesion.token, opciones.numeroVault, wrappedPw);
  }

  get vinculado(): boolean {
    return this.estadoLocal !== null;
  }

  get vaultVinculado(): { numero: number; nombre: string } | null {
    if (this.estadoLocal === null) return null;
    return { numero: this.estadoLocal.vault.numero, nombre: this.estadoLocal.vault.nombre };
  }

  get resumenVinculo(): string {
    if (!this.estadoLocal) return 'sin vincular';
    return `«${this.estadoLocal.vault.nombre}» en ${this.estadoLocal.serverUrl} (cuenta ${this.estadoLocal.cuenta.email})`;
  }

  get nombreDeVault(): string {
    return this.estadoLocal?.vault.nombre ?? 'vault';
  }

  /** Las claves derivadas del vault vinculado (el export las necesita). */
  get claves(): SubKeys | null {
    if (this.keys !== null) return this.keys;
    const local = this.estadoLocal;
    return local === null ? null : subclavesDeHex(local.vault.subclaves);
  }

  /**
   * Una conexión NUEVA (abierta desde cero) para operaciones de lectura pesadas como el
   * export: no comparte el lock ni la conexión del ciclo de sync.
   */
  async conexionParaExport(): Promise<SyncConnection | null> {
    const local = this.estadoLocal ?? (await this.leerEstadoLocal());
    if (local === null) return null;

    const conn = new SyncConnection({
      baseUrl: local.serverUrl,
      token: local.cuenta.token,
      vault: local.vault.numero,
      device: local.cuenta.deviceId,
      keys: subclavesDeHex(local.vault.subclaves),
    });
    await conn.open({ since: 0 });
    return conn;
  }

  // ------------------------------------------------------------------ resolución de conflictos

  /** Las intenciones bloqueadas (conflictos pendientes), para la UI de resolución. */
  async conflictosPendientes(): Promise<IntentEntry[]> {
    if (this.store === null) return [];
    return this.store.listIntents('blocked');
  }

  /**
   * Resuelve un conflicto bloqueado con la elección del usuario y agenda un ciclo: el
   * pull retoma desde el checkpoint y todo lo que estaba encolado fluye.
   */
  async resolver(intentId: string, eleccion: EleccionDeResolucion): Promise<void> {
    const { store, port, keys } = this;
    if (store === null || port === null || keys === null) {
      throw new Error('el motor no está iniciado (¿vinculaste el vault?)');
    }

    const intent = await store.getIntent(intentId);
    if (intent === null) throw new Error('ese conflicto ya no existe');

    // Con el ciclo en marcha se usa su conexión; si todavía no abrió (recién arrancado,
    // como en el pedido E2E) se abre una al vuelo — el resolver solo baja el blob.
    const conn = this.conn ?? (await this.conexionParaExport());
    if (conn === null) throw new Error('no hay sesión guardada (¿vinculaste el vault?)');

    try {
      await resolverBloqueado({ store, port, keys }, intent, eleccion, conn);
    } finally {
      if (conn !== this.conn) conn.close();
    }
    this.marcarSucio(250);
  }

  // ------------------------------------------------------------------ vinculación

  private async pedirJson<T>(
    ruta: string,
    opciones: { metodo?: string; token?: string; cuerpo?: unknown } = {},
  ): Promise<T> {
    const headers: Record<string, string> = { ...cabeceraCliente(this.versionPropia) };
    if (opciones.token !== undefined) headers.authorization = `Bearer ${opciones.token}`;
    if (opciones.cuerpo !== undefined) headers['content-type'] = 'application/json';

    const respuesta = await fetch(ruta, {
      method: opciones.metodo ?? 'GET',
      headers,
      body: opciones.cuerpo === undefined ? undefined : JSON.stringify(opciones.cuerpo),
    });
    if (!respuesta.ok) {
      throw new Error(`${opciones.metodo ?? 'GET'} ${ruta} → HTTP ${respuesta.status}: ${await respuesta.text()}`);
    }
    return (await respuesta.json()) as T;
  }

  /**
   * Vincula la carpeta a un vault de la cuenta CONECTADA. La password del vault se usa para
   * derivar (KEK → unwrap → subclaves) y NO se persiste.
   */
  async vincular(opciones: { numeroVault: number; passwordVault: string }): Promise<string> {
    const sesion = await this.leerSesion();
    if (sesion === null) throw new Error('primero entrá con tu cuenta (Ajustes → Cuenta)');

    // Compatibilidad ANTES de tocar nada (ADR-0018): si el plugin quedó viejo lo dice acá,
    // con el mensaje del veredicto, y no se escribe un solo byte.
    const compat = await this.compatibilidad();
    if (!compat.ok) throw new Error(compat.bloqueo ?? 'este plugin no es compatible con el server');

    const base = sesion.serverUrl;
    this.fijarEstado('sincronizando', 'vinculando…');

    // 1) El vault tiene que ser de esta cuenta (misma sesión para todo).
    const vaults = await this.pedirJson<VaultSummary[]>(`${base}/api/v1/vaults`, {
      token: sesion.token,
    });
    const elegido = vaults.find((vault) => vault.id === opciones.numeroVault);
    if (!elegido) {
      if (vaults.length === 0) {
        throw new Error(
          'tu cuenta todavía no tiene ningún vault: creá el primero con «Crear un vault nuevo…»',
        );
      }
      const lista = vaults.map((vault) => `#${vault.id} «${vault.name}»`).join(', ');
      throw new Error(`el vault #${opciones.numeroVault} no está en la cuenta. Disponibles: ${lista}`);
    }

    // 2) Material + derivación local (el servidor no ve ninguna password).
    const material = await this.pedirJson<VaultMaterial>(
      `${base}/api/v1/vaults/${opciones.numeroVault}/material`,
      { token: sesion.token },
    );
    if (material.vault_id === null) {
      throw new Error('el vault no tiene vault_id: material incompleto');
    }

    const salt = b64Decode(material.salt);
    const vaultUuid = b64Decode(material.vault_id);
    // El wire manda los parámetros como string JSON (mismo camino que el CLI).
    const kdfParams = JSON.parse(material.kdf_params) as KdfParams;
    const kek = deriveKek(opciones.passwordVault, salt, kdfParams);
    const vaultKey = unwrapKeyPw(b64Decode(material.wrapped_key_pw), kek, vaultUuid, salt);
    const subkeys = deriveSubkeys(vaultKey, salt);

    // 3) Persistir y arrancar.
    this.estadoLocal = {
      serverUrl: base,
      cuenta: { email: sesion.email, token: sesion.token, deviceId: sesion.deviceId },
      vault: {
        numero: elegido.id,
        nombre: elegido.name,
        vaultUuidB64: material.vault_id,
        epoch: material.epoch,
        subclaves: subclavesAHex(subkeys),
      },
    };
    await this.guardarEstadoLocal(this.estadoLocal);

    await this.iniciar();
    return `vinculado: ${this.resumenVinculo}`;
  }

  /**
   * Crea un vault NUEVO desde el plugin: el material se genera ACÁ (el servidor no ve la
   * password), se registra en el server y el motor queda vinculado a esta carpeta. La
   * recovery key se devuelve UNA vez — quien la reciba no la puede volver a pedir.
   */
  async crearVault(opciones: {
    nombre: string;
    passwordVault: string;
  }): Promise<{ id: number; recoveryHex: string }> {
    const sesion = await this.leerSesion();
    if (sesion === null) throw new Error('primero entrá con tu cuenta (Ajustes → Cuenta)');

    // Mismo criterio que al vincular: sin compatibilidad no se crea nada en el server.
    const compat = await this.compatibilidad();
    if (!compat.ok) throw new Error(compat.bloqueo ?? 'este plugin no es compatible con el server');

    const base = sesion.serverUrl;
    this.fijarEstado('sincronizando', 'creando vault…');

    // 2) Material nuevo (idéntico a `create-remote` del CLI).
    const vaultUuid = randomVaultUuid();
    const vaultKey = randomVaultKey();
    const salt = randomSalt();
    const recoverySecret = randomRecoverySecret();

    const kek = deriveKek(opciones.passwordVault, salt);
    const wrappedPw = wrapKeyPw(vaultKey, kek, vaultUuid, salt);
    const kekRecovery = deriveKekRecovery(recoverySecret, salt);
    const wrappedRc = wrapKeyRc(vaultKey, kekRecovery, vaultUuid);
    const identidad = identityFromSubkeys(deriveSubkeys(vaultKey, salt));

    const cuerpo: CreateVaultWire = {
      name: opciones.nombre,
      salt: b64Encode(salt),
      kdf_params: {
        m_kib: KDF_DEFAULTS.m_kib,
        t: KDF_DEFAULTS.t,
        p: KDF_DEFAULTS.p,
        dk_len: KDF_DEFAULTS.dk_len,
      },
      wrapped_key_pw: b64Encode(wrappedPw),
      wrapped_key_rc: b64Encode(wrappedRc),
      vault_pubkey: b64Encode(identidad.pubkey),
      vault_id: b64Encode(vaultUuid),
    };

    const { id } = await this.pedirJson<{ id: number }>(`${base}/api/v1/vaults`, {
      metodo: 'POST',
      token: sesion.token,
      cuerpo,
    });

    // 3) Estado local (los subkeys ya están en memoria: nada de re-bajar el material).
    this.estadoLocal = {
      serverUrl: base,
      cuenta: { email: sesion.email, token: sesion.token, deviceId: sesion.deviceId },
      vault: {
        numero: id,
        nombre: opciones.nombre,
        vaultUuidB64: b64Encode(vaultUuid),
        epoch: 1,
        subclaves: subclavesAHex(deriveSubkeys(vaultKey, salt)),
      },
    };
    await this.guardarEstadoLocal(this.estadoLocal);

    await this.iniciar();
    return { id, recoveryHex: toHex(recoverySecret) };
  }

  // ------------------------------------------------------------------ ciclo de vida

  async iniciar(): Promise<void> {
    if (this.iniciando) return;
    this.iniciando = true;
    try {
      const local = this.estadoLocal ?? (await this.leerEstadoLocal());
      if (!local) {
        await this.leerSesion(); // puede haber cuenta conectada sin vault vinculado
        this.fijarEstado('apagado', 'sin vincular');
        return;
      }
      this.estadoLocal = local;
      await this.leerSesion();

      // Compatibilidad (ADR-0018): un plugin viejo contra un server nuevo no sincroniza
      // nada. Se corta acá, antes de abrir el índice y la conexión.
      const compat = await this.compatibilidad();
      if (!compat.ok) {
        this.fijarEstado('error', compat.bloqueo ?? 'este plugin no es compatible con el server');
        return;
      }
      if (compat.aviso !== null) await this.registrarEnLog('apagado', compat.aviso);

      this.conn?.close();
      this.conn = null;
      this.store?.close();

      this.port = new AdaptadorDeArchivos(this.app.vault.adapter);
      this.store = await StateStore.open(nombreDeIndice(local.vault.vaultUuidB64));
      this.keys = subclavesDeHex(local.vault.subclaves);
      this.vaultUuidBytes = b64Decode(local.vault.vaultUuidB64);

      // Journal: intenciones de un cierre anterior se recuperan (hash a hash, sin adivinar).
      const recuperacion = await recoverApplies({
        store: this.store,
        port: this.port,
        keys: this.keys,
      });

      this.conn = new SyncConnection({
        baseUrl: local.serverUrl,
        token: local.cuenta.token,
        vault: local.vault.numero,
        device: local.cuenta.deviceId,
        keys: this.keys,
      });
      const checkpoint = await this.store.readCheckpoint().catch(() => null);
      await this.conn.open({ since: checkpoint?.since ?? 0 });

      const detalleRecuperacion =
        recuperacion.completed + recuperacion.cleaned + recuperacion.blocked > 0
          ? ` · recuperación: ${recuperacion.completed} completadas, ${recuperacion.cleaned} limpiadas, ${recuperacion.blocked} bloqueadas`
          : '';
      this.fijarEstado('al-dia', `conectado a ${local.serverUrl}${detalleRecuperacion}`);

      // Asentamiento: un ciclo tras el arranque (el puente puede haber perdido eventos).
      this.marcarSucio(ASENTAMIENTO_MS);
    } catch (error) {
      this.fijarEstado('error', `no pude iniciar el motor: ${String(error)}`);
      throw error;
    } finally {
      this.iniciando = false;
    }
  }

  async detener(): Promise<void> {
    if (this.timerPendiente !== null) {
      ventana.clearTimeout(this.timerPendiente);
      this.timerPendiente = null;
    }
    this.conn?.close();
    this.conn = null;
    this.store?.close();
    this.store = null;
    this.port = null;
    this.keys = null;
    this.vaultUuidBytes = null;
    this.fijarEstado('apagado', 'motor detenido');
  }

  /**
   * Suelta el vínculo de esta carpeta: cierra el motor, borra el estado local y ELIMINA el
   * índice durable del vault anterior. Lo último es clave: si el índice sobreviviera, un
   * vault NUEVO sobre la misma carpeta compararía contra la base vieja y no subiría nada.
   * Los datos del vault remoto no se tocan.
   */
  async desvincular(): Promise<void> {
    await this.detener();
    // El nombre del índice va por vault: hay que capturarlo ANTES de borrar el estado local.
    const vaultUuidB64 = this.estadoLocal?.vault.vaultUuidB64 ?? null;
    this.estadoLocal = null;
    await this.app.vault.adapter.remove(this.rutaEstado).catch(() => undefined);
    if (vaultUuidB64 !== null) await borrarIndiceDurable(vaultUuidB64);
    this.fijarEstado('apagado', 'sin vincular');
  }

  // ------------------------------------------------------------------ el ciclo

  /** Los cambios coalescidos del puente entran por acá: debounce global + lock. */
  marcarSucio(demoraMs = DEBOUNCE_MS): void {
    if (this.conn === null) return;
    this.sucio = true;
    if (this.timerPendiente !== null) ventana.clearTimeout(this.timerPendiente);
    this.timerPendiente = ventana.setTimeout(() => {
      this.timerPendiente = null;
      void this.correrCicloSeguro();
    }, demoraMs);
  }

  /** Ciclo a demanda (comando "Sincronizar ahora"). */
  async correrAhora(): Promise<SyncCycleReport | null> {
    return this.correrCicloSeguro();
  }

  private async correrCicloSeguro(): Promise<SyncCycleReport | null> {
    if (this.store === null || this.conn === null || this.keys === null || this.port === null) {
      return null;
    }
    if (this.corriendo) {
      this.sucio = true; // ya hay un ciclo: que repita al terminar
      return null;
    }

    this.corriendo = true;
    this.fijarEstado('sincronizando', 'ciclo en curso');
    try {
      let reporte: SyncCycleReport;
      do {
        this.sucio = false;
        reporte = await correrCiclo({
          store: this.store,
          port: this.port,
          keys: this.keys,
          conn: this.conn,
          vaultUuid: this.vaultUuidBytes!,
          epoch: this.estadoLocal?.vault.epoch ?? 1,
        });
      } while (this.sucio);

      this.estado.ultimaSync = Date.now();
      this.estado.ultimoReporte = reporte;

      if (reporte.estado === 'con-conflictos') {
        const primero = reporte.conflictos[0];
        this.fijarEstado(
          'con-conflictos',
          `${reporte.conflictos.length} conflicto(s): ${primero?.mensaje ?? 'sin detalle'}`,
        );
      } else if (reporte.estado === 'resync-requerido') {
        this.fijarEstado('error', 'resync requerido (fase 4): el historial del server no alcanza');
      } else {
        const subidas = reporte.push?.empujadas ?? 0;
        const bajadas = reporte.pull.applied;
        const detalle =
          subidas + bajadas === 0 ? 'sin cambios' : `↑${subidas} subidas · ↓${bajadas} aplicadas`;
        this.fijarEstado('al-dia', detalle);
      }

      return reporte;
    } catch (error) {
      this.fijarEstado('error', `ciclo con error: ${String(error)}`);
      return null;
    } finally {
      this.corriendo = false;
    }
  }

  private fijarEstado(fase: FaseDelMotor, detalle: string): void {
    this.estado = { ...this.estado, fase, detalle };
    this.avisar(this.estado);
    void this.registrarEnLog(fase, detalle);
  }

  /**
   * Log operativo acotado junto al plugin (sin UI): cada transición de fase queda ahí.
   * El configDir no emite eventos y los dotfiles son invisibles al watcher (medido en el
   * spike), así que este archivo no puede alimentar bucles. Nunca rompe al motor.
   */
  private async registrarEnLog(fase: FaseDelMotor, detalle: string): Promise<void> {
    try {
      const linea = `${new Date().toISOString()} ${fase} — ${detalle}\n`;
      let previo = '';
      try {
        previo = await this.app.vault.adapter.read(this.rutaLog);
      } catch {
        /* todavía no existe */
      }
      if (previo.length > LOG_MAX_BYTES) previo = previo.slice(-LOG_MAX_BYTES / 2);
      await this.app.vault.adapter.write(this.rutaLog, previo + linea);
    } catch {
      /* el log jamás rompe el motor */
    }
  }
}
