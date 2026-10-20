/**
 * Resolución de conflictos desde el plugin.
 *
 * Cuando el pull bloquea una revisión (tercera versión: editada en ambos lados), el
 * comando «Resolver conflictos…» abre la LISTA completa y deja elegir:
 *
 *  - **Mi versión (local)**: el archivo queda INTACTO; la base avanza al remoto y el
 *    push sube tu edición como la versión nueva.
 *  - **La versión del server**: se baja y PISA el local (tu edición se descarta a
 *    propósito).
 *
 * Se puede resolver archivo por archivo o TODOS de una vez (misma elección para el
 * lote). Un fallo en uno no frena al resto: cada conflicto es independiente y lo peor
 * que puede pasar es que quede bloqueado (no se pierde nada).
 *
 * El pedido `resolver-pedido.json` (sin UI) permite el E2E de desarrollo.
 */

import { Modal, Notice, Setting, type App } from 'obsidian';
import type { EleccionDeResolucion, IntentEntry } from '@ovaultd/core';

import type PluginOvaultd from './main';

import { ventana } from './entorno';
import { dirDelPlugin } from './rutas';

const MAX_FILAS = 50;

const etiqueta = (eleccion: EleccionDeResolucion): string =>
  eleccion === 'local' ? 'tu versión' : 'la del server';

class ModalDeConflictos extends Modal {
  constructor(
    app: App,
    private readonly opciones: {
      pendientes: IntentEntry[];
      alResolverTodos: (eleccion: EleccionDeResolucion) => void;
      alResolverUno: (intent: IntentEntry, eleccion: EleccionDeResolucion) => void;
    },
  ) {
    super(app);
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();
    const total = this.opciones.pendientes.length;

    contentEl.createEl('h2', { text: `Conflictos pendientes (${total})` });
    contentEl.createEl('p', {
      text:
        'Cada archivo cambió en los dos lados desde la última sincronización. Elegí qué ' +
        'versión gana: la tuya queda y se sube, o se baja la del server y la tuya se descarta.',
    });

    new Setting(contentEl)
      .setName('Aplicar a TODOS')
      .setDesc(`Resolver los ${total} conflictos con la misma elección, de una vez.`)
      .addButton((boton) =>
        boton
          .setButtonText('Quedarme con la mía')
          .setCta()
          .onClick(() => {
            this.close();
            this.opciones.alResolverTodos('local');
          }),
      )
      .addButton((boton) =>
        boton.setButtonText('Usar la del server').onClick(() => {
          this.close();
          this.opciones.alResolverTodos('remoto');
        }),
      );

    contentEl.createEl('hr');

    for (const intent of this.opciones.pendientes.slice(0, MAX_FILAS)) {
      const fila = new Setting(contentEl)
        .setName(intent.path ?? intent.pathId.slice(0, 12))
        .setDesc(intent.reason ?? 'conflicto sin detalle');
      fila.addButton((boton) =>
        boton.setButtonText('Mía').onClick(() => {
          this.close();
          this.opciones.alResolverUno(intent, 'local');
        }),
      );
      fila.addButton((boton) =>
        boton.setButtonText('Server').onClick(() => {
          this.close();
          this.opciones.alResolverUno(intent, 'remoto');
        }),
      );
    }

    if (total > MAX_FILAS) {
      contentEl.createEl('p', {
        text: `… y ${total - MAX_FILAS} más. Usá «Aplicar a TODOS» o resolvé estos y volvé a abrir.`,
      });
    }
  }

  onClose(): void {
    this.contentEl.empty();
  }
}

function abrirModal(plugin: PluginOvaultd, pendientes: IntentEntry[]): void {
  if (pendientes.length === 0) {
    new Notice('ovaultd: no hay conflictos pendientes.');
    return;
  }

  new ModalDeConflictos(plugin.app, {
    pendientes,
    alResolverTodos: (eleccion) => {
      void plugin.motor
        .resolverTodos(eleccion)
        .then(({ resueltos, fallidos }) => {
          if (fallidos.length === 0) {
            new Notice(
              `ovaultd: ${resueltos} conflicto(s) resueltos (${etiqueta(eleccion)}). Sincronizando…`,
              8_000,
            );
            return;
          }
          new Notice(
            `ovaultd: ${resueltos} resueltos, ${fallidos.length} fallaron (${fallidos[0]!.error}).`,
            12_000,
          );
        })
        .catch((error) => {
          new Notice(`ovaultd: no pude resolver — ${String(error)}`, 10_000);
        });
    },
    alResolverUno: (intent, eleccion) => {
      void plugin.motor
        .resolver(intent.intentId, eleccion)
        .then(() => {
          new Notice(`ovaultd: resuelto (${etiqueta(eleccion)}). Sincronizando…`, 6_000);
          // Si quedan, se reabre la lista con lo que falta (la anterior ya está vieja).
          void plugin.motor.conflictosPendientes().then((restantes) => {
            if (restantes.length > 0) abrirModal(plugin, restantes);
          });
        })
        .catch((error) => {
          new Notice(`ovaultd: no pude resolver — ${String(error)}`, 10_000);
        });
    },
  }).open();
}

/** Comando de paleta/opciones: lista completa de conflictos, con resolución en lote. */
export async function comandoResolver(plugin: PluginOvaultd): Promise<void> {
  let pendientes: IntentEntry[];
  try {
    pendientes = await plugin.motor.conflictosPendientes();
  } catch (error) {
    new Notice(`ovaultd: no pude leer los conflictos — ${String(error)}`);
    return;
  }
  abrirModal(plugin, pendientes);
}

/** Pedido sin UI (E2E): resuelve el primer conflicto con la `eleccion` indicada. */
export async function procesarPedidoDeResolucion(plugin: PluginOvaultd): Promise<void> {
  const adapter = plugin.app.vault.adapter;
  const dir = dirDelPlugin(plugin.app);
  const rutaPedido = `${dir}/resolver-pedido.json`;
  const rutaResultado = `${dir}/resolver-resultado.json`;

  let crudo: string;
  try {
    crudo = await adapter.read(rutaPedido);
  } catch {
    return; // sin pedido: nada que hacer
  }

  await adapter.remove(rutaPedido).catch(() => undefined);

  let resultado: Record<string, unknown>;
  try {
    const pedido = JSON.parse(crudo) as { eleccion?: string };
    const eleccion: EleccionDeResolucion = pedido.eleccion === 'local' ? 'local' : 'remoto';

    // El pedido puede caer ANTES de que el primer ciclo detecte el conflicto (el pull
    // corre unos segundos después de arrancar): se espera hasta un minuto a que aparezca.
    let pendientes = await plugin.motor.conflictosPendientes();
    for (let intento = 0; pendientes.length === 0 && intento < 60; intento += 1) {
      await new Promise((seguir) => ventana.setTimeout(seguir, 1000));
      pendientes = await plugin.motor.conflictosPendientes();
    }

    if (pendientes.length === 0) {
      resultado = { ok: false, error: 'no hay conflictos pendientes' };
    } else {
      const intent = pendientes[0]!;
      await plugin.motor.resolver(intent.intentId, eleccion);
      resultado = {
        ok: true,
        path: intent.path,
        eleccion,
        restantes: pendientes.length - 1,
      };
    }
  } catch (error) {
    resultado = { ok: false, error: String(error) };
  }

  await adapter
    .write(rutaResultado, `${JSON.stringify(resultado, null, 2)}\n`)
    .catch(() => undefined);
  new Notice('ovaultd: pedido E2E de resolución procesado');
}
