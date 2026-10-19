import { Notice, Plugin } from 'obsidian';

import { AdaptadorDeArchivos, PuenteDeEventos, type CambioDeVault } from './ObsidianFileAdapter';
import { cabeceraCliente, evaluarCompatibilidad, type MetaDelServer } from './compat';
import { carpetaDelPlugin } from './rutas';
import { comandoExportar, comandoImportar, procesarPedidosDeE2E } from './ExportImport';
import { comandoResolver, procesarPedidoDeResolucion } from './Resolver';
import {
  comandoHistoriaDeNota,
  comandoHistoriaDeRuta,
  procesarPedidoDeHistoria,
} from './HistoryView';
import { comandoCrearVault } from './CrearVault';
import { AjustesDeOvaultd, AJUSTES_POR_DEFECTO, TabAjustes } from './SettingsTab';
import { RegistroDeSpike } from './spikeEventos';
import { MotorDeSync, type EstadoDelMotor } from './sync-engine';

const REANUDADO_MIN_MS = 20_000;

/**
 * Corte 3b de la fase 3: el motor de sync ENCHUFADO.
 *
 *  - El adaptador convierte la API del vault en el `FileSystemPort` del núcleo.
 *  - El puente coalesce los eventos y descarta los que causó nuestra propia escritura
 *    (por hash esperado, nunca "por intervalo").
 *  - El `MotorDeSync` (sync-engine.ts) corre el núcleo durable dentro del renderer:
 *    cambios coalescidos → ciclo pull→push con debounce global y lock.
 */
export default class PluginOvaultd extends Plugin {
  ajustes!: AjustesDeOvaultd;
  adaptador!: AdaptadorDeArchivos;
  puente!: PuenteDeEventos;
  motor!: MotorDeSync;

  private spike: RegistroDeSpike | null = null;
  /** Barra de estado. En móvil `addStatusBarItem()` no está disponible: puede venir null. */
  private estadoEl: HTMLElement | null = null;
  private contadorCambios = 0;
  private ultimoAviso = 0;

  get motorEstado(): EstadoDelMotor {
    return this.motor.estado;
  }

  get motorVinculado(): boolean {
    return this.motor.vinculado;
  }

  async onload(): Promise<void> {
    await this.cargarAjustes();

    this.estadoEl = this.addStatusBarItem();
    this.pintarEstado('ovaultd: sin vincular');

    this.adaptador = new AdaptadorDeArchivos(this.app.vault.adapter);
    this.motor = new MotorDeSync(
      this.app,
      (estado) => this.mostrarEstadoDelMotor(estado),
      this.manifest.version,
    );
    this.motor.modoDeSync = this.ajustes.modo;

    this.puente = new PuenteDeEventos(this.app.vault, {
      onCambio: (cambio) => this.alCambiar(cambio),
      esCambioPropio: (cambio) =>
        'path' in cambio
          ? this.adaptador.esCambioPropio(
              cambio.path,
              cambio.tipo,
              cambio.tipo === 'renombrado' ? cambio.oldPath : undefined,
            )
          : Promise.resolve(false),
      onDescartado: (cambio) => this.spike?.registrarCoalescido(cambio, true),
    });
    this.puente.iniciar();

    this.addSettingTab(new TabAjustes(this.app, this));

    this.addCommand({
      id: 'probar-conexion',
      name: 'Probar conexión con el servidor',
      callback: () => {
        void this.probarConexion();
      },
    });

    this.addCommand({
      id: 'sincronizar-ahora',
      name: 'Sincronizar ahora (ciclo completo)',
      callback: () => {
        void this.sincronizarAhora();
      },
    });

    this.addCommand({
      id: 'exportar-vault',
      name: 'Exportar el vault remoto a una carpeta…',
      callback: () => {
        comandoExportar(this);
      },
    });

    this.addCommand({
      id: 'importar-carpeta',
      name: 'Importar una carpeta al vault…',
      callback: () => {
        comandoImportar(this);
      },
    });

    this.addCommand({
      id: 'resolver-conflicto',
      name: 'Resolver conflicto de sincronización…',
      callback: () => {
        void comandoResolver(this);
      },
    });

    this.addCommand({
      id: 'historia-nota',
      name: 'Ver historia de esta nota…',
      callback: () => {
        comandoHistoriaDeNota(this);
      },
    });

    this.addCommand({
      id: 'historia-archivo',
      name: 'Ver historia de un archivo (por ruta)…',
      callback: () => {
        comandoHistoriaDeRuta(this);
      },
    });

    this.addCommand({
      id: 'crear-vault',
      name: 'Crear un vault nuevo…',
      callback: () => {
        void comandoCrearVault(this);
      },
    });

    this.addCommand({
      id: 'motor-estado',
      name: 'Estado del motor',
      callback: () => {
        const estado = this.motor.estado;
        new Notice(`ovaultd: ${estado.fase} — ${estado.detalle}`);
      },
    });

    this.addCommand({
      id: 'spike-iniciar',
      name: 'Spike: iniciar registro de eventos',
      callback: () => {
        void this.iniciarSpike();
      },
    });

    this.addCommand({
      id: 'spike-detener',
      name: 'Spike: detener registro de eventos',
      callback: () => {
        void this.detenerSpike();
      },
    });

    // Arranque y reanudación (plan de fase 3, paso 2): el motor corre al iniciar y al
    // volver el foco (throttle), además de los eventos coalescidos del puente.
    this.app.workspace.onLayoutReady(() => {
      this.puente.avisar('inicio');
      this.motor.marcarSucio(5_000);
    });
    this.registerDomEvent(window, 'focus', () => {
      const ahora = Date.now();
      if (ahora - this.ultimoAviso < REANUDADO_MIN_MS) return;
      this.ultimoAviso = ahora;
      this.puente.avisar('reanudado');
      this.motor.marcarSucio();
    });

    // El spike se auto-activa si el marcador está junto al plugin (para medir sin UI).
    if (await RegistroDeSpike.marcadorActivo(this.app.vault.adapter, this.app.vault.configDir)) {
      await this.iniciarSpike();
    }

    // Motor: si hay estado local (vault ya vinculado), arranca solo.
    void this.motor.iniciar().catch((error) => {
      console.error('ovaultd: no pude iniciar el motor', error);
    });

    // Pedidos de export/import dejados junto al plugin (disparo sin UI para el E2E).
    void procesarPedidosDeE2E(this).catch((error) => {
      console.error('ovaultd: los pedidos de E2E fallaron', error);
    });

    // Pedido de resolución de conflicto (mismo mecanismo, para el E2E de la fase 5).
    void procesarPedidoDeResolucion(this).catch((error) => {
      console.error('ovaultd: el pedido de resolución falló', error);
    });

    // Pedido de historia (mismo mecanismo, para el E2E de la fase 5, corte 5d).
    void procesarPedidoDeHistoria(this).catch((error) => {
      console.error('ovaultd: el pedido de historia falló', error);
    });

    if (this.ajustes.serverUrl !== '') {
      void this.probarConexion();
    }
  }

  onunload(): void {
    this.spike?.detener();
    this.puente.detener();
    void this.motor.detener();
  }

  async cargarAjustes(): Promise<void> {
    const guardados = (await this.loadData()) as Partial<AjustesDeOvaultd> | null;
    this.ajustes = { ...AJUSTES_POR_DEFECTO, ...(guardados ?? {}) };
  }

  async guardarAjustes(): Promise<void> {
    await this.saveData(this.ajustes);
    // El modo es estado vivo del motor: se aplica en el próximo ciclo sin reiniciar nada.
    this.motor.modoDeSync = this.ajustes.modo;
  }

  private mostrarEstadoDelMotor(estado: EstadoDelMotor): void {
    const texto =
      estado.fase === 'al-dia'
        ? `ovaultd: al día${estado.detalle === 'sin cambios' ? '' : ` · ${estado.detalle}`}`
        : `ovaultd: ${estado.fase === 'con-conflictos' ? '⚠ conflictos' : estado.fase}`;
    this.pintarEstado(texto, estado.detalle);
  }

  /**
   * Pinta el estado en la barra de estado. En móvil no hay barra: `addStatusBarItem()` está
   * documentado como no disponible ahí, así que el elemento puede ser null y no se pinta nada
   * (el estado sigue visible en los ajustes del plugin).
   */
  private pintarEstado(texto: string, detalle?: string): void {
    // Chequeo falsy a propósito: en móvil puede faltar el elemento y no siempre es `null`.
    if (!this.estadoEl) return;
    this.estadoEl.setText(texto);
    this.estadoEl.setAttribute('title', detalle ?? '');
  }

  private alCambiar(cambio: CambioDeVault): void {
    this.contadorCambios += 1;
    this.spike?.registrarCoalescido(cambio, false);
    if (cambio.tipo !== 'inicio' && cambio.tipo !== 'reanudado') {
      this.motor.marcarSucio();
    }
  }

  /** La llama el formulario de cuenta: login de cuenta UNA vez (sesión persistente). */
  async entrarCuenta(opciones: {
    serverUrl: string;
    email: string;
    passwordCuenta: string;
  }): Promise<boolean> {
    if (!opciones.serverUrl || !opciones.email || !opciones.passwordCuenta) {
      new Notice('ovaultd: completá servidor, email y password de la cuenta.');
      return false;
    }
    new Notice('ovaultd: entrando…');
    try {
      const mensaje = await this.motor.entrar(opciones);
      this.ajustes.serverUrl = opciones.serverUrl.trim();
      this.ajustes.email = opciones.email.trim();
      await this.guardarAjustes();
      new Notice(`ovaultd: ${mensaje}`);
      return true;
    } catch (error) {
      new Notice(`ovaultd: no pude entrar — ${String(error)}`, 10_000);
      return false;
    }
  }

  get cuentaConectada() {
    return this.motor.cuentaConectada;
  }

  get vaultVinculado() {
    return this.motor.vaultVinculado;
  }

  /** La llama la lista de vaults: vínculo de un vault de la cuenta conectada. */
  async vincularVault(opciones: {
    numero: number;
    passwordVault: string;
  }): Promise<boolean> {
    if (!Number.isInteger(opciones.numero) || opciones.numero <= 0) {
      new Notice('ovaultd: elegí un vault de la lista.');
      return false;
    }
    if (!opciones.passwordVault) {
      new Notice('ovaultd: falta la password del vault.');
      return false;
    }

    new Notice('ovaultd: vinculando (derivación de clave local, puede tardar)…');
    try {
      const mensaje = await this.motor.vincular({
        numeroVault: opciones.numero,
        passwordVault: opciones.passwordVault,
      });
      new Notice(`ovaultd: ${mensaje}`);
      return true;
    } catch (error) {
      new Notice(`ovaultd: no pude vincular — ${String(error)}`, 10_000);
      return false;
    }
  }

  async sincronizarAhora(): Promise<void> {
    if (!this.motorVinculado) {
      new Notice('ovaultd: no hay vault vinculado todavía.');
      return;
    }
    new Notice('ovaultd: ciclo en curso…');
    const reporte = await this.motor.correrAhora();
    if (reporte === null) {
      new Notice('ovaultd: el ciclo no corrió (revisá el estado del motor).');
      return;
    }
    if (reporte.estado === 'con-conflictos') {
      new Notice(
        `ovaultd: ${reporte.conflictos.length} conflicto(s) — ${reporte.conflictos[0]?.mensaje ?? ''}`,
        10_000,
      );
    } else if (reporte.estado === 'resync-requerido') {
      new Notice('ovaultd: resync requerido (fase 4).', 10_000);
    } else {
      const subidas = reporte.push?.empujadas ?? 0;
      new Notice(`ovaultd: al día — ↑${subidas} subidas · ↓${reporte.pull.applied} aplicadas.`);
    }
  }

  async iniciarSpike(): Promise<void> {
    if (this.spike !== null) return;
    this.spike = new RegistroDeSpike(this.app.vault, this.app.vault.adapter);
    this.spike.iniciar();
    const dir = this.manifest.dir ?? carpetaDelPlugin(this.app.vault.configDir);
    await this.app.vault.adapter
      .append(`${dir}/spike.activo`, `${new Date().toISOString()}\n`)
      .catch(() => undefined);
    new Notice(`ovaultd: spike de eventos ACTIVO (log en ${dir}/spike.jsonl)`);
  }

  async detenerSpike(): Promise<void> {
    if (this.spike === null) return;
    this.spike.detener();
    this.spike = null;
    const dir = this.manifest.dir ?? carpetaDelPlugin(this.app.vault.configDir);
    await this.app.vault.adapter.remove(`${dir}/spike.activo`).catch(() => undefined);
    new Notice('ovaultd: spike de eventos detenido');
  }

  /**
   * GET /healthz con `fetch` crudo (no `requestUrl`, que esquiva CORS): queremos
   * probar EXACTAMENTE el camino del motor. Si esto falla en un dispositivo, el
   * motor también va a fallar ahí.
   */
  async probarConexion(): Promise<void> {
    const base = this.ajustes.serverUrl.trim().replace(/\/+$/, '');
    if (base === '') {
      new Notice('ovaultd: configurá la URL del servidor primero.');
      return;
    }

    try {
      const cabeceras = { ...cabeceraCliente(this.manifest.version) };
      const respuesta = await fetch(`${base}/healthz`, { headers: cabeceras, cache: 'no-store' });
      const cuerpo = (await respuesta.json()) as { status?: string };

      if (!respuesta.ok || cuerpo.status !== 'ok') {
        new Notice(`ovaultd: respuesta inesperada (${respuesta.status})`);
        return;
      }

      // Además de «responde», el veredicto de compatibilidad (ADR-0018): es justo lo que
      // hace falta saber ANTES de vincular.
      const meta = await fetch(`${base}/api/v1/meta`, { headers: cabeceras, cache: 'no-store' });
      if (!meta.ok) {
        new Notice(`ovaultd: el servidor responde, pero /meta devolvió ${meta.status}.`);
        return;
      }
      const veredicto = evaluarCompatibilidad(
        this.manifest.version,
        (await meta.json()) as MetaDelServer,
      );
      if (!veredicto.ok) {
        new Notice(`ovaultd: ${veredicto.bloqueo}`);
        return;
      }
      new Notice(
        veredicto.aviso !== null
          ? `ovaultd: servidor OK · ${veredicto.aviso}`
          : `ovaultd: servidor OK y compatible (plugin ${this.manifest.version}).`,
      );
    } catch (error) {
      new Notice(`ovaultd: no pude hablar con el servidor — ${String(error)}`);
    }
  }
}
