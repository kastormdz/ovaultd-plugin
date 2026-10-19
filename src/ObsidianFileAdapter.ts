/**
 * El puente de archivos del plugin hacia el núcleo (`FileSystemPort`) + el puente de
 * EVENTOS del vault, en un solo archivo como manda el plan (paso 2 del corte).
 *
 * - `AdaptadorDeArchivos`: implementa el contrato EXACTO del core (`stat/read/writeTemp/
 *   rename/unlink/mkdirp/list`) sobre la API del vault de Obsidian. Las escrituras van
 *   temporal → rename, igual que el `NodeFileAdapter` del CLI. A diferencia del CLI, la
 *   API del vault no expone `fsync` ni `lstat`: la durabilidad fina la da el journal del
 *   núcleo (intención → verificación → commit) y los symlinks no se pueden detectar —
 *   el confinamiento lo impone la propia API (paths relativos, siempre dentro del vault).
 *
 * - `PuenteDeEventos`: traduce `create/modify/delete/rename` a cambios COALESCIDOS por
 *   path (silencio de 250 ms), sin perder el último cambio: un evento que llega mientras
 *   se está emitiendo arranca una entrada nueva. Los cambios que causó NUESTRA propia
 *   escritura no se descartan "por intervalo": se descartan por **hash esperado** — si el
 *   hash real no coincide, el cambio es legítimo y se emite igual.
 */

import { cryptoProvider } from '@ovaultd/crypto';
import { ventana } from './entorno';
import type { FileSystemPort, VaultDirEntry, VaultStat } from '@ovaultd/core';
import { toHex } from '@ovaultd/protocol';
import type { DataAdapter, EventRef, ListedFiles, TAbstractFile, Vault } from 'obsidian';

const PREFIJO_TEMPORAL = '.ovaultd-tmp-';
const VENCIMIENTO_ESPERADO_MS = 60_000;
const MAX_ESPERADOS = 500;

const esCarpetaAbstracta = (archivo: TAbstractFile): boolean => 'children' in archivo;

const arrayBufferExacto = (bytes: Uint8Array): ArrayBuffer => bytes.slice().buffer;

export class AdaptadorDeArchivos implements FileSystemPort {
  /** tempRel → sha256 hex del contenido que nosotros escribimos. */
  private readonly temporales = new Map<string, string>();
  /** destRel → { hash esperado, cuándo }: lo que NUESTRO publish dejó en el destino. */
  private readonly esperados = new Map<string, { hash: string; ts: number }>();
  /** rel → vencimiento: borrados que causó nuestra aplicación de un tombstone remoto. */
  private readonly borradosEsperados = new Map<string, number>();

  constructor(private readonly datos: DataAdapter) {}

  static esTemporal(path: string): boolean {
    return path.split('/').some((segmento) => segmento.startsWith(PREFIJO_TEMPORAL));
  }

  /** `'.'` es la raíz para el puerto; el adapter de Obsidian usa `''` (o `'/'`). */
  private normalizar(rel: string): string {
    let camino = rel;
    while (camino.startsWith('./')) camino = camino.slice(2);
    return camino === '.' ? '' : camino;
  }

  private async sha256Hex(bytes: Uint8Array): Promise<string> {
    return toHex(cryptoProvider().sha256(bytes));
  }

  async stat(rel: string): Promise<VaultStat | null> {
    try {
      const st = await this.datos.stat(this.normalizar(rel));
      if (st === null) return null;
      return {
        size: st.size,
        mtimeMs: st.mtime,
        isFile: st.type === 'file',
        isDirectory: st.type === 'folder',
      };
    } catch {
      return null;
    }
  }

  /** Stat masivo (el adapter local no paga round-trip, pero el escaneo lo usa igual). */
  async statMany(rels: string[]): Promise<Array<VaultStat | null>> {
    return Promise.all(rels.map((rel) => this.stat(rel)));
  }

  async read(rel: string): Promise<Uint8Array> {
    const buffer = await this.datos.readBinary(this.normalizar(rel));
    return new Uint8Array(buffer);
  }

  async writeTemp(relDir: string, bytes: Uint8Array): Promise<{ tempName: string }> {
    const dir = this.normalizar(relDir);
    const nombre = `${PREFIJO_TEMPORAL}${toHex(crypto.getRandomValues(new Uint8Array(8)))}`;
    const rutaRel = dir === '' ? nombre : `${dir}/${nombre}`;

    const hash = await this.sha256Hex(bytes);
    await this.datos.writeBinary(rutaRel, arrayBufferExacto(bytes));
    this.temporales.set(rutaRel, hash);

    return { tempName: rutaRel };
  }

  async rename(relFrom: string, relTo: string): Promise<void> {
    const desde = this.normalizar(relFrom);
    const hacia = this.normalizar(relTo);

    // El `rename` del adapter de Obsidian NO pisa el destino: cuando el motor aplica una
    // revisión sobre un archivo que ya existe (writeTemp → rename), tira "Destination file
    // already exists". El rename de POSIX (el del NodeFileAdapter del CLI) sí pisa, así que el
    // núcleo nunca notó la diferencia — y bajar un cambio moría el ciclo entero.
    //
    // Borrar el destino antes de renombrar tampoco sirve: ese hueco (remove + rename) le llega
    // al watcher como delete + create, y Obsidian desvincula la pestaña ABIERTA de la nota —
    // "desaparece" de la vista y hay que volver a buscarla. El camino correcto es un modify:
    // el contenido del temporal se escribe SOBRE el destino, la vista abierta se refresca en
    // vivo y el destino nunca deja de existir. La durabilidad no depende de este paso: el
    // journal del núcleo re-aplica desde el temporal verificado si algo se corta.
    if (desde !== hacia && (await this.datos.exists(hacia))) {
      const bytes = await this.datos.readBinary(desde);
      await this.datos.writeBinary(hacia, bytes);
      await this.datos.remove(desde);
    } else {
      await this.datos.rename(desde, hacia);
    }

    // Nuestro publish: el temporal pasa a ser el destino con hash conocido.
    const hash = this.temporales.get(desde);
    if (hash !== undefined) {
      this.temporales.delete(desde);
      this.esperados.set(hacia, { hash, ts: Date.now() });
    }
  }

  async unlink(rel: string): Promise<void> {
    const ruta = this.normalizar(rel);
    this.borradosEsperados.set(ruta, Date.now() + VENCIMIENTO_ESPERADO_MS);
    await this.datos.remove(ruta);
  }

  async mkdirp(rel: string): Promise<void> {
    const dir = this.normalizar(rel);
    if (dir === '') return;

    // Nivel por nivel a propósito: `mkdir` del adapter NO promete crear los padres.
    let prefijo = '';
    for (const parte of dir.split('/')) {
      prefijo = prefijo === '' ? parte : `${prefijo}/${parte}`;
      if (!(await this.datos.exists(prefijo))) {
        await this.datos.mkdir(prefijo);
      }
    }
  }

  async list(relDir: string): Promise<VaultDirEntry[]> {
    const dir = this.normalizar(relDir);

    let crudo: ListedFiles;
    try {
      crudo = await this.datos.list(dir);
    } catch (error) {
      // En algunas versiones la raíz no acepta `''`; `'/'` es la alternativa natural.
      if (dir !== '') throw error;
      crudo = await this.datos.list('/');
    }

    const nombreDe = (ruta: string): string => ruta.slice(ruta.lastIndexOf('/') + 1);
    return [
      ...crudo.files.map((ruta) => ({ name: nombreDe(ruta), isFile: true, isDirectory: false })),
      ...crudo.folders.map((ruta) => ({ name: nombreDe(ruta), isFile: false, isDirectory: true })),
    ];
  }

  /**
   * ¿Este evento del vault lo causó NUESTRA escritura? (journal + hash esperado)
   * Los temporales propios se descartan siempre; los destinos publicados solo si el
   * hash REAL coincide con el que escribimos — si no, el usuario tocó el archivo y el
   * cambio se emite igual (nada de ignorar eventos "por intervalo").
   */
  async esCambioPropio(
    path: string,
    tipo: 'creado' | 'modificado' | 'borrado' | 'renombrado',
    oldPath?: string,
  ): Promise<boolean> {
    if (AdaptadorDeArchivos.esTemporal(path)) return true;
    if (oldPath !== undefined && AdaptadorDeArchivos.esTemporal(oldPath)) return true;

    if (tipo === 'borrado') {
      const vencimiento = this.borradosEsperados.get(path);
      this.borradosEsperados.delete(path);
      return vencimiento !== undefined && vencimiento > Date.now();
    }

    this.podarEsperados();
    const esperado = this.esperados.get(path);
    if (esperado === undefined) return false;

    this.esperados.delete(path);
    const contenido = await this.datos.readBinary(this.normalizar(path)).catch(() => null);
    if (contenido === null) return false;
    return (await this.sha256Hex(new Uint8Array(contenido))) === esperado.hash;
  }

  private podarEsperados(): void {
    if (this.esperados.size <= MAX_ESPERADOS) {
      const limite = Date.now() - VENCIMIENTO_ESPERADO_MS;
      for (const [clave, valor] of this.esperados) {
        if (valor.ts < limite) this.esperados.delete(clave);
      }
      return;
    }
    this.esperados.clear();
  }
}

export type CambioDeVault =
  | { tipo: 'creado' | 'modificado' | 'borrado'; path: string; carpeta: boolean }
  | { tipo: 'renombrado'; path: string; oldPath: string; carpeta: boolean }
  | { tipo: 'inicio' | 'reanudado' };

export interface OpcionesDelPuente {
  /** Silencio por path antes de emitir (ms). Default 250. */
  estabilidadMs?: number;
  onCambio: (cambio: CambioDeVault) => void | Promise<void>;
  /** Consulta del journal de escrituras propias (la implementa el adaptador). */
  esCambioPropio: (cambio: CambioDeVault) => Promise<boolean>;
  /** Instrumentación (spike): cambios que se descartaron por ser propios. */
  onDescartado?: (cambio: CambioDeVault) => void;
}

type TipoPendiente = 'creado' | 'modificado' | 'borrado' | 'renombrado';

interface Pendiente {
  tipo: TipoPendiente;
  oldPath?: string;
  carpeta: boolean;
  timer: number;
}

export class PuenteDeEventos {
  private readonly pendientes = new Map<string, Pendiente>();
  private readonly refs: EventRef[] = [];
  private corriendo = false;

  constructor(
    private readonly vault: Vault,
    private readonly opciones: OpcionesDelPuente,
  ) {}

  iniciar(): void {
    if (this.corriendo) return;
    this.corriendo = true;

    this.refs.push(
      this.vault.on('create', (archivo) => this.registrar(archivo.path, 'creado', archivo)),
    );
    this.refs.push(
      this.vault.on('modify', (archivo) => this.registrar(archivo.path, 'modificado', archivo)),
    );
    this.refs.push(
      this.vault.on('delete', (archivo) => this.registrar(archivo.path, 'borrado', archivo)),
    );
    this.refs.push(
      this.vault.on('rename', (archivo, oldPath) =>
        this.registrar(archivo.path, 'renombrado', archivo, oldPath),
      ),
    );
  }

  detener(): void {
    this.corriendo = false;
    for (const ref of this.refs) this.vault.offref(ref);
    this.refs.length = 0;
    for (const pendiente of this.pendientes.values()) ventana.clearTimeout(pendiente.timer);
    this.pendientes.clear();
  }

  /** Avisos globales (arranque/reanudación): sin coalescer, sin check de propiedad. */
  avisar(tipo: 'inicio' | 'reanudado'): void {
    void this.opciones.onCambio({ tipo });
  }

  pendientesRestantes(): number {
    return this.pendientes.size;
  }

  private registrar(
    path: string,
    tipo: TipoPendiente,
    archivo: TAbstractFile,
    oldPath?: string,
  ): void {
    if (tipo === 'renombrado' && oldPath !== undefined) {
      // El rename ABSORBE el pendiente del path viejo: emitir un `modificado` de una
      // ruta que ya no existe sería ruido (el motor lo leería como borrado fantasma).
      const pendienteViejo = this.pendientes.get(oldPath);
      if (pendienteViejo !== undefined) {
        ventana.clearTimeout(pendienteViejo.timer);
        this.pendientes.delete(oldPath);
      }
    }

    const previo = this.pendientes.get(path);
    const fusion = previo === undefined ? tipo : fusionar(previo.tipo, tipo);

    if (fusion === null) {
      // creado + borrado dentro de la ventana: neto nada (archivo transitorio).
      if (previo !== undefined) ventana.clearTimeout(previo.timer);
      this.pendientes.delete(path);
      return;
    }

    const pendiente: Pendiente = {
      tipo: fusion,
      oldPath: fusion === 'renombrado' ? (tipo === 'renombrado' ? oldPath : previo?.oldPath) : undefined,
      carpeta: esCarpetaAbstracta(archivo),
      timer: ventana.setTimeout(
        () => void this.vaciar(path),
        this.opciones.estabilidadMs ?? 250,
      ),
    };

    if (previo !== undefined) ventana.clearTimeout(previo.timer);
    this.pendientes.set(path, pendiente);
  }

  private async vaciar(path: string): Promise<void> {
    const pendiente = this.pendientes.get(path);
    if (pendiente === undefined) return;
    this.pendientes.delete(path);

    const cambio: CambioDeVault =
      pendiente.tipo === 'renombrado'
        ? { tipo: 'renombrado', path, oldPath: pendiente.oldPath ?? '', carpeta: pendiente.carpeta }
        : { tipo: pendiente.tipo, path, carpeta: pendiente.carpeta };

    try {
      if (await this.opciones.esCambioPropio(cambio)) {
        this.opciones.onDescartado?.(cambio);
        return;
      }
      await this.opciones.onCambio(cambio);
    } catch (error) {
      console.error('ovaultd: puente de eventos', error);
    }
  }
}

/** Fusión conservadora de eventos consecutivos sobre el mismo path. `null` = cancelar. */
function fusionar(previo: TipoPendiente, nuevo: TipoPendiente): TipoPendiente | null {
  if (nuevo === 'renombrado') return 'renombrado';
  if (previo === 'renombrado') return nuevo === 'borrado' ? 'borrado' : 'renombrado';

  if (previo === 'creado' && nuevo === 'modificado') return 'creado';
  if (previo === 'creado' && nuevo === 'borrado') return null;
  if (previo === 'modificado' && nuevo === 'borrado') return 'borrado';
  if (previo === 'borrado' && nuevo === 'creado') return 'modificado';
  return nuevo;
}
