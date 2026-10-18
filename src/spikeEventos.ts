/**
 * Instrumentación del SPIKE de fase 3 — se retira cuando el motor esté medido.
 *
 * Qué mide (plan de fase 3: "cómo coalescen los eventos en uso real no está medido"):
 *  1. Eventos CRUDOS del vault (`create/modify/delete/rename`) con timestamp, para
 *     comparar contra los coalescidos y calibrar la ventana de estabilidad.
 *  2. Sondas de ESTABILIDAD: al crear/modificar, relee el archivo a +0/+80/+300 ms
 *     registrando tamaño y sha256 corto — ¿cuándo queda el contenido final?
 *  3. ¿El configDir (`.obsidian/`) emite eventos? El log vive ahí: sus propias
 *     escrituras se cuentan pero no se registran (evita el bucle).
 *
 * Formato: JSONL en `.obsidian/plugins/ovaultd/spike.jsonl`, un objeto por línea.
 * Activo por marcador (`spike.activo`) junto al plugin, o por comando.
 */

import { cryptoProvider } from '@ovaultd/crypto';
import { toHex } from '@ovaultd/protocol';
import type { DataAdapter, EventRef, TAbstractFile, Vault } from 'obsidian';

import type { CambioDeVault } from './ObsidianFileAdapter';
import { ventana } from './entorno';
import { carpetaDelPlugin } from './rutas';

/** Archivos del spike, dentro de la carpeta del plugin (que depende del configDir). */
const ARCHIVO_LOG = 'spike.jsonl';
const ARCHIVO_MARCADOR = 'spike.activo';
const CADENCIA_VOLCADO_MS = 1200;
const RETARDOS_SONDA_MS = [0, 80, 300];
const MAX_BYTES_SONDA = 2 * 1024 * 1024;

type ObjetoDeSpike =
  | { x: 'crudo'; t: number; tipo: string; path: string; oldPath?: string; carpeta: boolean }
  | { x: 'coalescido'; t: number; tipo: string; path?: string; descartado: boolean }
  | { x: 'sonda'; t: number; path: string; retardoMs: number; size: number; mtimeMs: number; hash16: string }
  | { x: 'meta'; t: number; autoEventos: number; buffer: number };

const esCarpetaAbstracta = (archivo: TAbstractFile): boolean => 'children' in archivo;

export class RegistroDeSpike {
  private readonly buffer: ObjetoDeSpike[] = [];
  private readonly refs: EventRef[] = [];
  private timerVolcado: number | null = null;
  private activo = false;
  private autoEventos = 0;
  private autoEventosVolcados = 0;
  private sondasEnVuelo = 0;

  constructor(
    private readonly vault: Vault,
    private readonly datos: DataAdapter,
  ) {}

  private get dir(): string {
    return carpetaDelPlugin(this.vault.configDir);
  }

  static async marcadorActivo(datos: DataAdapter, configDir: string): Promise<boolean> {
    return datos
      .exists(`${carpetaDelPlugin(configDir)}/${ARCHIVO_MARCADOR}`)
      .catch(() => false);
  }

  iniciar(): void {
    if (this.activo) return;
    this.activo = true;

    this.refs.push(
      this.vault.on('create', (a) => this.crudo('creado', a)),
      this.vault.on('modify', (a) => this.crudo('modificado', a)),
      this.vault.on('delete', (a) => this.crudo('borrado', a)),
      this.vault.on('rename', (a, oldPath) => this.crudo('renombrado', a, oldPath)),
    );

    this.timerVolcado = ventana.setInterval(() => void this.volcar(), CADENCIA_VOLCADO_MS);
  }

  detener(): void {
    this.activo = false;
    for (const ref of this.refs) this.vault.offref(ref);
    this.refs.length = 0;
    if (this.timerVolcado !== null) {
      ventana.clearInterval(this.timerVolcado);
      this.timerVolcado = null;
    }
    void this.volcar();
  }

  registrarCoalescido(cambio: CambioDeVault, descartado: boolean): void {
    if (!this.activo) return;
    const path = 'path' in cambio ? cambio.path : undefined;
    this.buffer.push({ x: 'coalescido', t: Date.now(), tipo: cambio.tipo, path, descartado });
  }

  private crudo(tipo: string, archivo: TAbstractFile, oldPath?: string): void {
    if (!this.activo) return;

    if (archivo.path.startsWith(`${this.dir}/`)) {
      // ¿El configDir emite? Se cuentan; registrarlos sería un bucle (el log vive acá).
      this.autoEventos += 1;
      return;
    }

    this.buffer.push({
      x: 'crudo',
      t: Date.now(),
      tipo,
      path: archivo.path,
      oldPath,
      carpeta: esCarpetaAbstracta(archivo),
    });

    if (tipo === 'creado' || tipo === 'modificado') {
      for (const retardoMs of RETARDOS_SONDA_MS) this.programarSonda(archivo.path, retardoMs);
    }
  }

  private programarSonda(path: string, retardoMs: number): void {
    if (this.sondasEnVuelo > 400) return;
    this.sondasEnVuelo += 1;

    ventana.setTimeout(() => {
      void (async () => {
        try {
          const st = await this.datos.stat(path);
          if (st === null || st.type !== 'file' || st.size > MAX_BYTES_SONDA) return;
          const bytes = new Uint8Array(await this.datos.readBinary(path));
          const hash16 = toHex(cryptoProvider().sha256(bytes)).slice(0, 16);
          this.buffer.push({
            x: 'sonda',
            t: Date.now(),
            path,
            retardoMs,
            size: st.size,
            mtimeMs: st.mtime,
            hash16,
          });
        } catch {
          // El archivo puede haber desaparecido entre eventos: no es un dato del spike.
        } finally {
          this.sondasEnVuelo -= 1;
        }
      })();
    }, retardoMs);
  }

  private async volcar(): Promise<void> {
    if (this.buffer.length === 0 && this.autoEventos === this.autoEventosVolcados) return;

    if (this.autoEventos !== this.autoEventosVolcados) {
      this.buffer.push({
        x: 'meta',
        t: Date.now(),
        autoEventos: this.autoEventos,
        buffer: this.buffer.length,
      });
      this.autoEventosVolcados = this.autoEventos;
    }

    const lineas = this.buffer.splice(0, this.buffer.length).map((o) => JSON.stringify(o));
    try {
      await this.datos.append(`${this.dir}/${ARCHIVO_LOG}`, `${lineas.join('\n')}\n`);
    } catch (error) {
      console.error('ovaultd: spike no pudo escribir el log', error);
    }
  }
}
