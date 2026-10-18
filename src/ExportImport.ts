/**
 * Export/Import desde las opciones del plugin (fase 3d).
 *
 *  - **Export**: baja el HEAD completo del vault REMOTO y lo escribe en claro en la
 *    carpeta que elijas (solo escritorio: hace falta el FS del SO, más allá del vault).
 *    Reusa el núcleo (`exportarVault`): delta colapsado al estado vivo + descifrado +
 *    validación portable de rutas antes de tocar el disco.
 *  - **Import**: copia una carpeta al vault; desde ahí el motor la ve como cambios
 *    locales y la sube solo. La política (`debeImportar`) deja afuera dotfiles y la
 *    basura de dev; lo que ya existe en el vault no se pisa.
 *
 * El FS del SO se pide con `window.require` dinámico (ver `fsDesktop.ts`): la puerta
 * anti-Node del build queda intacta y en móvil los comandos avisan y no corren.
 *
 * Los archivos `export-pedido.json` / `import-pedido.json` junto al plugin permiten
 * disparar una operación sin UI (E2E de desarrollo): dejan su resultado en
 * `export-resultado.json` / `import-resultado.json`.
 */

import { Modal, Notice, Setting, type App, type DataAdapter } from 'obsidian';
import { exportarVault, type PuertoDeExport } from '@ovaultd/core';

import { fsDesktop } from './fsDesktop';
import type PluginOvaultd from './main';
import { debeImportar } from './rutasDeImport';

import { dirDelPlugin } from './rutas';

export interface ResultadoExportUI {
  ok: true;
  escritas: number;
  omitidas: number;
  bloqueadas: number;
  bytes: number;
  destino: string;
}

export interface ResultadoImportUI {
  ok: true;
  importados: number;
  saltados: number;
  origen: string;
}

// ------------------------------------------------------------------ export

/** Baja el vault remoto completo y lo escribe descifrado en `destino`. */
export async function ejecutarExport(
  plugin: PluginOvaultd,
  destino: string,
  sobrescribir: boolean,
): Promise<ResultadoExportUI> {
  const fsd = fsDesktop();
  if (fsd === null) throw new Error('el export necesita la app de escritorio (FS del sistema)');
  if (destino.trim() === '') throw new Error('falta la carpeta destino');

  const conn = await plugin.motor.conexionAlVuelo();
  if (conn === null) throw new Error('no hay vault vinculado');
  const keys = plugin.motor.claves;
  if (keys === null) throw new Error('faltan las claves del vault');

  const puerto: PuertoDeExport = {
    async existe(ruta) {
      return fsd.fs.existsSync(fsd.path.join(destino, ruta));
    },
    async escribir(ruta, contenido) {
      const completa = fsd.path.join(destino, ruta);
      fsd.fs.mkdirSync(fsd.path.dirname(completa), { recursive: true });
      fsd.fs.writeFileSync(completa, contenido);
    },
  };

  const aviso = new Notice('ovaultd: exportando…', 0);
  try {
    const resultado = await exportarVault({
      conn,
      keys,
      puerto,
      omitirExistentes: !sobrescribir,
      onProgreso: (hechos, total) => {
        aviso.messageEl.setText(`ovaultd: exportando… ${hechos}/${total}`);
      },
    });

    return { ok: true, ...resultado, destino };
  } finally {
    conn.close();
    aviso.hide();
  }
}

// ------------------------------------------------------------------ import

/** Copia `origen` (recursivo) al vault. No pisa lo que ya existe. */
export async function ejecutarImport(
  plugin: PluginOvaultd,
  origen: string,
): Promise<ResultadoImportUI> {
  const fsd = fsDesktop();
  if (fsd === null) throw new Error('el import necesita la app de escritorio (FS del sistema)');
  if (origen.trim() === '') throw new Error('falta la carpeta de origen');

  const raiz = fsd.path.resolve(origen);
  if (!fsd.fs.existsSync(raiz)) throw new Error(`la carpeta no existe: ${raiz}`);

  // 1) Enumerar (recursivo) con la política del import.
  const archivos: string[] = [];
  const recorrer = (dir: string, relativo: string): void => {
    for (const entrada of fsd.fs.readdirSync(dir, { withFileTypes: true })) {
      const rel = relativo === '' ? entrada.name : `${relativo}/${entrada.name}`;
      if (entrada.isDirectory()) {
        recorrer(fsd.path.join(dir, entrada.name), rel);
        continue;
      }
      if (entrada.isFile() && debeImportar(rel)) {
        archivos.push(rel);
      }
    }
  };
  recorrer(raiz, '');

  // 2) Copiar al vault por el adapter (así pasa por los caminos normales del vault:
  //    el watcher lo ve, el puente lo coalesce y el motor lo sube).
  const adapter = plugin.app.vault.adapter;
  const aviso = new Notice(`ovaultd: importando ${archivos.length} archivo(s)…`, 0);
  let importados = 0;
  let saltados = 0;

  try {
    for (const rel of archivos) {
      if (await adapter.exists(rel)) {
        saltados += 1;
        continue; // no se pisa lo que ya está
      }

      await crearPadres(adapter, rel);
      const bytes = fsd.fs.readFileSync(fsd.path.join(raiz, rel));
      await adapter.writeBinary(rel, bytes.slice().buffer);
      importados += 1;
      aviso.messageEl.setText(`ovaultd: importando… ${importados + saltados}/${archivos.length}`);
    }
  } finally {
    aviso.hide();
  }

  return { ok: true, importados, saltados, origen: raiz };
}

/** `mkdir -p` con el adapter del vault (no promete crear los padres). */
async function crearPadres(adapter: DataAdapter, ruta: string): Promise<void> {
  const partes = ruta.split('/');
  partes.pop();

  let acumulada = '';
  for (const parte of partes) {
    acumulada = acumulada === '' ? parte : `${acumulada}/${parte}`;
    if (!(await adapter.exists(acumulada))) {
      await adapter.mkdir(acumulada);
    }
  }
}

// ------------------------------------------------------------------ modal y comandos

class ModalDeRuta extends Modal {
  constructor(
    app: App,
    private readonly opciones: {
      titulo: string;
      descripcion: string;
      valorInicial: string;
      textoBoton: string;
      alAceptar: (ruta: string) => void;
    },
  ) {
    super(app);
  }

  onOpen(): void {
    this.contentEl.createEl('h2', { text: this.opciones.titulo });
    this.contentEl.createEl('p', { text: this.opciones.descripcion });

    let ruta = this.opciones.valorInicial;
    const ajuste = new Setting(this.contentEl).addText((texto) => {
      texto.setValue(this.opciones.valorInicial);
      texto.onChange((valor) => {
        ruta = valor.trim();
      });
    });
    ajuste.settingEl.addClass('ovaultd-campo-vertical');

    new Setting(this.contentEl)
      .addButton((boton) => boton.setButtonText('Cancelar').onClick(() => this.close()))
      .addButton((boton) =>
        boton
          .setButtonText(this.opciones.textoBoton)
          .setCta()
          .onClick(() => {
            this.close();
            this.opciones.alAceptar(ruta);
          }),
      );
  }

  onClose(): void {
    this.contentEl.empty();
  }
}

const selloDeTiempo = (fecha: Date): string =>
  `${fecha.getFullYear()}${String(fecha.getMonth() + 1).padStart(2, '0')}${String(fecha.getDate()).padStart(2, '0')}-` +
  `${String(fecha.getHours()).padStart(2, '0')}${String(fecha.getMinutes()).padStart(2, '0')}`;

/** Comando de paleta: exportar el vault remoto a una carpeta. */
export function comandoExportar(plugin: PluginOvaultd): void {
  const fsd = fsDesktop();
  if (fsd === null) {
    new Notice('ovaultd: el export necesita la app de escritorio.');
    return;
  }
  if (!plugin.motorVinculado) {
    new Notice('ovaultd: primero vinculá un vault (ajustes del plugin).');
    return;
  }

  const sugerida = fsd.path.join(
    fsd.os.homedir(),
    `ovaultd-export-${plugin.motor.nombreDeVault}-${selloDeTiempo(new Date())}`,
  );

  new ModalDeRuta(plugin.app, {
    titulo: 'Exportar el vault a una carpeta',
    descripcion:
      `Baja TODO el vault remoto («${plugin.motor.nombreDeVault}») y lo escribe descifrado ` +
      'en la carpeta que elijas. Los archivos que ya existan se omiten.',
    valorInicial: sugerida,
    textoBoton: 'Exportar',
    alAceptar: (ruta) => {
      void ejecutarExport(plugin, ruta, false)
        .then((resultado) => {
          new Notice(
            `ovaultd: export listo — ${resultado.escritas} archivo(s)` +
              (resultado.omitidas > 0 ? `, ${resultado.omitidas} ya existían` : '') +
              (resultado.bloqueadas > 0 ? `, ${resultado.bloqueadas} bloqueados` : '') +
              `.\nCarpeta: ${resultado.destino}`,
            10_000,
          );
        })
        .catch((error) => {
          new Notice(`ovaultd: el export falló — ${String(error)}`, 10_000);
        });
    },
  }).open();
}

/** Comando de paleta: importar una carpeta al vault. */
export function comandoImportar(plugin: PluginOvaultd): void {
  const fsd = fsDesktop();
  if (fsd === null) {
    new Notice('ovaultd: el import necesita la app de escritorio.');
    return;
  }

  new ModalDeRuta(plugin.app, {
    titulo: 'Importar una carpeta al vault',
    descripcion:
      'Copia los archivos de la carpeta al vault (dotfiles y basura de dev quedan afuera; ' +
      'lo existente no se pisa). Después el motor los sube solo.',
    valorInicial: fsd.path.join(fsd.os.homedir(), ''),
    textoBoton: 'Importar',
    alAceptar: (ruta) => {
      void ejecutarImport(plugin, ruta)
        .then((resultado) => {
          new Notice(
            `ovaultd: import listo — ${resultado.importados} archivo(s) al vault` +
              (resultado.saltados > 0 ? ` (${resultado.saltados} ya existían)` : '') +
              '.\nEl motor los sincroniza solo.',
            10_000,
          );
        })
        .catch((error) => {
          new Notice(`ovaultd: el import falló — ${String(error)}`, 10_000);
        });
    },
  }).open();
}

// ------------------------------------------------------------------ pedidos sin UI (E2E)

/** Procesa `export-pedido.json` / `import-pedido.json` si existen (disparo sin UI). */
export async function procesarPedidosDeE2E(plugin: PluginOvaultd): Promise<void> {
  // Rutas derivadas del configDir del vault (no siempre `.obsidian`).
  const dir = dirDelPlugin(plugin.app);
  await procesarPedido(
    plugin,
    `${dir}/export-pedido.json`,
    `${dir}/export-resultado.json`,
    (pedido) =>
      ejecutarExport(plugin, String(pedido['ruta'] ?? ''), pedido['sobrescribir'] === true),
  );
  await procesarPedido(
    plugin,
    `${dir}/import-pedido.json`,
    `${dir}/import-resultado.json`,
    (pedido) => ejecutarImport(plugin, String(pedido['ruta'] ?? '')),
  );
}

async function procesarPedido(
  plugin: PluginOvaultd,
  rutaPedido: string,
  rutaResultado: string,
  ejecutar: (pedido: Record<string, unknown>) => Promise<object>,
): Promise<void> {
  const adapter = plugin.app.vault.adapter;

  let crudo: string;
  try {
    crudo = await adapter.read(rutaPedido);
  } catch {
    return; // sin pedido: nada que hacer
  }

  await adapter.remove(rutaPedido).catch(() => undefined);

  let resultado: object;
  try {
    const pedido = JSON.parse(crudo) as Record<string, unknown>;
    resultado = await ejecutar(pedido);
  } catch (error) {
    resultado = { ok: false, error: String(error) };
  }

  await adapter
    .write(rutaResultado, `${JSON.stringify(resultado, null, 2)}\n`)
    .catch(() => undefined);
  new Notice(`ovaultd: pedido E2E procesado (${rutaPedido.split('/').pop() ?? rutaPedido})`);
}
