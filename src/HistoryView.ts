/**
 * Historia por archivo, desde el plugin (fase 5, corte 5d).
 *
 * El comando «Ver historia de esta nota» abre la historia del archivo activo (o de la
 * ruta que escribas, incluso una BORRADA): cada revisión con su operación, fecha,
 * dispositivo y tamaño. Elegís una, ves el contenido (o el diff contra el archivo
 * actual) ANTES de tocar nada, y «Restaurar» escribe esa versión en el vault — el
 * motor la sube como revisión NUEVA: la historia jamás se reescribe.
 *
 * Todo sale de `historiaDeArchivo`/`contenidoDeRevision` del núcleo, con una conexión
 * al vuelo (nunca la del ciclo). El nombre de cada ruta sale de `path_enc` + la llave
 * del vault: el server no ve nada de esto.
 *
 * El pedido `historia-pedido.json` (sin UI) permite el E2E de desarrollo; deja el
 * resultado en `historia-resultado.json`.
 */

import { Modal, Notice, Setting, type App } from 'obsidian';
import {
  contenidoDeRevision,
  diffDeTextos,
  historiaDeArchivo,
  type ResultadoHistoria,
  type RevisionResumen,
  type SyncConnection,
} from '@ovaultd/core';
import type { SubKeys } from '@ovaultd/crypto';

import type PluginOvaultd from './main';
import { dirDelPlugin } from './rutas';

// ------------------------------------------------------------------- datos

/** Corre `fn` con una conexión al vuelo + las claves del vault (la cierra al salir). */
async function conConexion<T>(
  plugin: PluginOvaultd,
  fn: (conn: SyncConnection, keys: SubKeys) => Promise<T>,
): Promise<T> {
  const conn = await plugin.motor.conexionAlVuelo();
  if (conn === null) throw new Error('no hay vault vinculado');
  const keys = plugin.motor.claves;
  if (keys === null) throw new Error('faltan las claves del vault (¿vinculaste esta carpeta?)');

  try {
    return await fn(conn, keys);
  } finally {
    conn.close();
  }
}

export async function listarHistoria(
  plugin: PluginOvaultd,
  ruta: string,
  before?: number,
): Promise<ResultadoHistoria> {
  return conConexion(plugin, (conn, keys) =>
    historiaDeArchivo({ conn, keys, ruta, before, limit: 30 }),
  );
}

/** Contenido descifrado de una revisión (verifica el hash del blob antes de descifrar). */
export async function contenidoDeItem(plugin: PluginOvaultd, blobId: string): Promise<string> {
  const bytes = await conConexion(plugin, (conn, keys) =>
    contenidoDeRevision({ conn, keys, blobId }),
  );
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    throw new Error(`esa revisión no es texto UTF-8 (${bytes.length} bytes binarios)`);
  }
}

const etiquetaOp = (op: RevisionResumen['op']): string =>
  ({ add: 'alta', mod: 'edición', del: 'borrado', move: 'renombre' })[op];

const dispositivoTexto = (item: RevisionResumen): string =>
  item.deviceId === null ? '' : `dispositivo #${item.deviceId}`;

const fechaCorta = (ts: string): string => ts.replace('T', ' ').replace(/\.\d+Z?$/, '');

// ----------------------------------------------------------------- confirmación

class ModalDeConfirmacion extends Modal {
  constructor(
    app: App,
    private readonly opciones: { texto: string; alConfirmar: () => void },
  ) {
    super(app);
  }

  onOpen(): void {
    this.contentEl.createEl('h2', { text: 'Confirmar restore' });
    this.contentEl.createEl('p', { text: this.opciones.texto });

    new Setting(this.contentEl)
      .addButton((boton) =>
        boton
          .setButtonText('Sí, restaurar')
          .setCta()
          .onClick(() => {
            this.close();
            this.opciones.alConfirmar();
          }),
      )
      .addButton((boton) => boton.setButtonText('Cancelar').onClick(() => this.close()));
  }

  onClose(): void {
    this.contentEl.empty();
  }
}

// --------------------------------------------------------------------- modal

class ModalDeHistoria extends Modal {
  private items: RevisionResumen[] = [];
  private nextBefore: number | null = null;
  private minRev = 0;

  constructor(
    app: App,
    private readonly plugin: PluginOvaultd,
    private readonly opciones: { ruta: string },
  ) {
    super(app);
  }

  onOpen(): void {
    void this.render();
  }

  onClose(): void {
    this.contentEl.empty();
  }

  /** Lista (o agrega) una página de historia. */
  private async render(before?: number): Promise<void> {
    this.contentEl.empty();
    this.contentEl.createEl('h2', { text: 'Historia' });
    this.contentEl.createEl('p', { text: `«${this.opciones.ruta}»` });

    const cargando = this.contentEl.createEl('p', { text: 'cargando…' });
    let pagina: ResultadoHistoria;
    try {
      pagina = await listarHistoria(this.plugin, this.opciones.ruta, before);
    } catch (error) {
      cargando.setText(`no pude traer la historia: ${String(error)}`);
      cargando.addClass('mod-warning');
      return;
    }
    cargando.remove();

    if (before === undefined) {
      this.items = pagina.items;
    } else {
      this.items = [...this.items, ...pagina.items];
    }
    this.nextBefore = pagina.nextBefore;
    this.minRev = pagina.minRev;

    if (this.items.length === 0) {
      this.contentEl.createEl('p', {
        text: 'sin historia para esa ruta (si la renombraste, probá con el nombre viejo).',
      });
      return;
    }

    for (const item of this.items) {
      const fila = new Setting(this.contentEl)
        .setName(`rev ${item.rev} — ${etiquetaOp(item.op)}`)
        .setDesc(
          `${fechaCorta(item.ts)} · ${item.ruta ?? '(sin nombre)'} · ${item.size ?? 0} B${
            item.deviceId === null ? '' : ` · ${dispositivoTexto(item)}`
          }`,
        );

      if (item.blobId !== null) {
        fila.addButton((boton) =>
          boton.setButtonText('Ver').onClick(() => {
            void this.mostrarPreview(item);
          }),
        );
      }
    }

    if (this.nextBefore !== null) {
      new Setting(this.contentEl).addButton((boton) =>
        boton.setButtonText('Ver más antiguas').onClick(() => {
          void this.render(this.nextBefore ?? undefined);
        }),
      );
    }
    if (this.minRev > 0) {
      this.contentEl.createEl('p', {
        text: `(retención: la historia anterior a la rev ${this.minRev} ya no está)`,
      });
    }
  }

  /** Preview de una revisión: diff contra el archivo actual (o contenido si no existe). */
  private async mostrarPreview(item: RevisionResumen): Promise<void> {
    this.contentEl.empty();
    this.contentEl.createEl('h2', { text: `rev ${item.rev} — ${etiquetaOp(item.op)}` });
    this.contentEl.createEl('p', {
      text: `${fechaCorta(item.ts)} · ${dispositivoTexto(item) || 'sin dispositivo'} · ${item.size ?? 0} B`,
    });

    const cargando = this.contentEl.createEl('p', { text: 'bajando y descifrando…' });
    let texto: string;
    try {
      texto = await contenidoDeItem(this.plugin, item.blobId!);
    } catch (error) {
      cargando.setText(`no pude traer esa revisión: ${String(error)}`);
      cargando.addClass('mod-warning');
      this.pieDePreview(item, false);
      return;
    }
    cargando.remove();

    let actual: string | null = null;
    try {
      actual = await this.app.vault.adapter.read(this.opciones.ruta);
    } catch {
      actual = null;
    }

    const pre = this.contentEl.createEl('pre');
    if (actual === null) {
      this.contentEl
        .createEl('p', { text: '(el archivo no existe localmente: contenido completo de esa revisión)' })
        .addClass('mod-warning');
      pre.createEl('code', { text: texto });
    } else {
      const diff = diffDeTextos(actual, texto);
      this.contentEl.createEl('p', {
        text: diff === '' ? 'idéntica al archivo actual.' : 'cambios respecto del archivo actual:',
      });
      if (diff !== '') pre.createEl('code', { text: diff });
    }

    this.pieDePreview(item, true);
  }

  private pieDePreview(item: RevisionResumen, conRestaurar: boolean): void {
    if (conRestaurar) {
      new Setting(this.contentEl)
        .setName('Restaurar esta versión')
        .setDesc(
          'Escribe el contenido en el vault; el motor lo sube como revisión NUEVA (la historia no se reescribe).',
        )
        .addButton((boton) =>
          boton
            .setButtonText('Restaurar…')
            .setCta()
            .onClick(() => {
              new ModalDeConfirmacion(this.app, {
                texto: `¿Restaurar «${this.opciones.ruta}» a la rev ${item.rev}? El archivo actual se reemplaza y el motor lo sube como revisión nueva.`,
                alConfirmar: () => {
                  void this.restaurar(item);
                },
              }).open();
            }),
        );
    }

    new Setting(this.contentEl).addButton((boton) =>
      boton.setButtonText('← Volver a la lista').onClick(() => {
        void this.render();
      }),
    );
  }

  private async restaurar(item: RevisionResumen): Promise<void> {
    try {
      const texto = await contenidoDeItem(this.plugin, item.blobId!);
      await this.asegurarPadres(this.opciones.ruta);
      await this.app.vault.adapter.write(this.opciones.ruta, texto);
      new Notice(
        `ovaultd: «${this.opciones.ruta}» restaurado a la rev ${item.rev}; el motor lo sube en el próximo ciclo.`,
        8_000,
      );
      this.close();
    } catch (error) {
      new Notice(`ovaultd: no pude restaurar — ${String(error)}`, 10_000);
    }
  }

  /** La API del vault no crea los padres de una ruta: se crean nivel por nivel. */
  private async asegurarPadres(ruta: string): Promise<void> {
    const partes = ruta.split('/').slice(0, -1);
    let acumulada = '';
    for (const parte of partes) {
      acumulada = acumulada === '' ? parte : `${acumulada}/${parte}`;
      if (!(await this.app.vault.adapter.exists(acumulada))) {
        await this.app.vault.adapter.mkdir(acumulada);
      }
    }
  }
}

/** Modal con un campo de ruta (default: la nota activa) para la historia de cualquier archivo. */
class ModalDeRuta extends Modal {
  private ruta = '';

  constructor(
    app: App,
    private readonly plugin: PluginOvaultd,
  ) {
    super(app);
  }

  onOpen(): void {
    this.ruta = this.app.workspace.getActiveFile()?.path ?? '';

    this.contentEl.createEl('h2', { text: 'Historia de un archivo' });

    new Setting(this.contentEl)
      .setName('Ruta dentro del vault')
      .setDesc('Funciona también para archivos BORRADOS y nombres anteriores a un renombre.')
      .addText((texto) =>
        texto.setValue(this.ruta).onChange((valor) => {
          this.ruta = valor;
        }),
      );

    new Setting(this.contentEl)
      .addButton((boton) =>
        boton
          .setButtonText('Ver historia')
          .setCta()
          .onClick(() => {
            const ruta = this.ruta.trim();
            if (ruta === '') {
              new Notice('ovaultd: escribí una ruta (por ejemplo Notas/Proyecto.md).');
              return;
            }
            this.close();
            new ModalDeHistoria(this.app, this.plugin, { ruta }).open();
          }),
      )
      .addButton((boton) => boton.setButtonText('Cancelar').onClick(() => this.close()));
  }

  onClose(): void {
    this.contentEl.empty();
  }
}

// ------------------------------------------------------------------ comandos

/** Comando de paleta/opciones: historia de la nota activa. */
export function comandoHistoriaDeNota(plugin: PluginOvaultd): void {
  const activo = plugin.app.workspace.getActiveFile();
  if (activo === null) {
    new Notice('ovaultd: abrí una nota para ver su historia (o usá «Historia de un archivo…»).');
    return;
  }
  new ModalDeHistoria(plugin.app, plugin, { ruta: activo.path }).open();
}

/** Comando de paleta/opciones: historia por ruta (sirve para borrados). */
export function comandoHistoriaDeRuta(plugin: PluginOvaultd): void {
  new ModalDeRuta(plugin.app, plugin).open();
}

// -------------------------------------------------------------- pedido E2E

/** Pedido sin UI (E2E): `historia-pedido.json` → `historia-resultado.json`. */
export async function procesarPedidoDeHistoria(plugin: PluginOvaultd): Promise<void> {
  const adapter = plugin.app.vault.adapter;
  const dir = dirDelPlugin(plugin.app);
  const rutaPedido = `${dir}/historia-pedido.json`;
  const rutaResultado = `${dir}/historia-resultado.json`;

  let crudo: string;
  try {
    crudo = await adapter.read(rutaPedido);
  } catch {
    return; // sin pedido: nada que hacer
  }

  await adapter.remove(rutaPedido).catch(() => undefined);

  let resultado: Record<string, unknown>;
  try {
    const pedido = JSON.parse(crudo) as {
      ruta?: string;
      rev?: number;
      restaurar?: boolean;
      before?: number;
    };
    const ruta = typeof pedido.ruta === 'string' ? pedido.ruta : '';
    if (ruta === '') throw new Error('falta ruta');

    const pagina = await listarHistoria(
      plugin,
      ruta,
      typeof pedido.before === 'number' ? pedido.before : undefined,
    );
    resultado = {
      ok: true,
      items: pagina.items,
      nextBefore: pagina.nextBefore,
      minRev: pagina.minRev,
    };

    if (typeof pedido.rev === 'number') {
      const item = pagina.items.find((candidato) => candidato.rev === pedido.rev);
      if (!item) throw new Error(`la rev ${pedido.rev} no está en la página devuelta`);
      if (item.blobId === null) {
        resultado.sinContenido = true;
      } else {
        const texto = await contenidoDeItem(plugin, item.blobId);
        resultado.texto = texto;
        if (pedido.restaurar === true) {
          await adapter.write(ruta, texto);
          resultado.restaurado = true;
        }
      }
    }
  } catch (error) {
    resultado = { ok: false, error: String(error) };
  }

  await adapter
    .write(rutaResultado, `${JSON.stringify(resultado, null, 2)}\n`)
    .catch(() => undefined);
  new Notice('ovaultd: pedido E2E de historia procesado');
}
