/**
 * Resolución de conflictos desde el plugin (fase 5, corte mínimo).
 *
 * Cuando el pull bloquea una revisión (tercera versión: editada en ambos lados), el
 * comando «Resolver conflicto…» muestra el conflicto y deja elegir:
 *
 *  - **Mi versión (local)**: el archivo queda INTACTO; la base avanza al remoto y el
 *    push sube tu edición como la versión nueva.
 *  - **La versión del server**: se baja y PISA el local (tu edición se descarta a
 *    propósito).
 *
 * En ambos casos el motor cierra la intención, el checkpoint avanza y el ciclo siguiente
 * hace fluir todo lo que estaba encolado (nada se pierde: el resto espera, no se descarta).
 *
 * El pedido `resolver-pedido.json` (sin UI) permite el E2E de desarrollo.
 */

import { Modal, Notice, Setting, type App } from 'obsidian';
import type { IntentEntry } from '@ovaultd/core';

import type PluginOvaultd from './main';

const RUTA_PEDIDO_RESOLVER = '.obsidian/plugins/ovaultd/resolver-pedido.json';
const RUTA_RESULTADO_RESOLVER = '.obsidian/plugins/ovaultd/resolver-resultado.json';

class ModalDeConflicto extends Modal {
  constructor(
    app: App,
    private readonly opciones: {
      path: string;
      motivo: string;
      alElegir: (eleccion: 'local' | 'remoto') => void;
    },
  ) {
    super(app);
  }

  onOpen(): void {
    this.contentEl.createEl('h2', { text: 'Resolver conflicto' });
    this.contentEl.createEl('p', {
      text: `«${this.opciones.path}» cambió en los dos lados desde la última sincronización.`,
    });
    const motivo = this.contentEl.createEl('p', { text: `Motivo: ${this.opciones.motivo}` });
    motivo.addClass('mod-warning');

    new Setting(this.contentEl)
      .setName('Mi versión (local)')
      .setDesc('Tu archivo queda como está. Se sube al server como la versión nueva.')
      .addButton((boton) =>
        boton
          .setButtonText('Quedarme con la mía')
          .setCta()
          .onClick(() => {
            this.close();
            this.opciones.alElegir('local');
          }),
      );

    new Setting(this.contentEl)
      .setName('La versión del server')
      .setDesc('Se baja la del server y PISA tu archivo local (tu edición se descarta).')
      .addButton((boton) =>
        boton.setButtonText('Usar la del server').onClick(() => {
          this.close();
          this.opciones.alElegir('remoto');
        }),
      );
  }

  onClose(): void {
    this.contentEl.empty();
  }
}

/** Comando de paleta/opciones: resolver el primer conflicto pendiente. */
export async function comandoResolver(plugin: PluginOvaultd): Promise<void> {
  let pendientes: IntentEntry[];
  try {
    pendientes = await plugin.motor.conflictosPendientes();
  } catch (error) {
    new Notice(`ovaultd: no pude leer los conflictos — ${String(error)}`);
    return;
  }

  if (pendientes.length === 0) {
    new Notice('ovaultd: no hay conflictos pendientes.');
    return;
  }

  const intent = pendientes[0]!;
  const restantes = pendientes.length - 1;

  new ModalDeConflicto(plugin.app, {
    path: intent.path ?? intent.pathId.slice(0, 12),
    motivo: intent.reason ?? 'conflicto sin detalle',
    alElegir: (eleccion) => {
      void plugin.motor
        .resolver(intent.intentId, eleccion)
        .then(() => {
          const sobra =
            restantes > 0 ? ` Quedan ${restantes} más (volvé a correr el comando).` : '';
          new Notice(
            `ovaultd: conflicto resuelto (${eleccion === 'local' ? 'tu versión' : 'la del server'}).${sobra} Sincronizando…`,
            8_000,
          );
        })
        .catch((error) => {
          new Notice(`ovaultd: no pude resolver — ${String(error)}`, 10_000);
        });
    },
  }).open();
}

/** Pedido sin UI (E2E): resuelve el primer conflicto con la `eleccion` indicada. */
export async function procesarPedidoDeResolucion(plugin: PluginOvaultd): Promise<void> {
  const adapter = plugin.app.vault.adapter;

  let crudo: string;
  try {
    crudo = await adapter.read(RUTA_PEDIDO_RESOLVER);
  } catch {
    return; // sin pedido: nada que hacer
  }

  await adapter.remove(RUTA_PEDIDO_RESOLVER).catch(() => undefined);

  let resultado: Record<string, unknown>;
  try {
    const pedido = JSON.parse(crudo) as { eleccion?: string };
    const eleccion = pedido.eleccion === 'local' ? 'local' : 'remoto';

    // El pedido puede caer ANTES de que el primer ciclo detecte el conflicto (el pull
    // corre unos segundos después de arrancar): se espera hasta un minuto a que aparezca.
    let pendientes = await plugin.motor.conflictosPendientes();
    for (let intento = 0; pendientes.length === 0 && intento < 60; intento += 1) {
      await new Promise((seguir) => globalThis.setTimeout(seguir, 1000));
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
    .write(RUTA_RESULTADO_RESOLVER, `${JSON.stringify(resultado, null, 2)}\n`)
    .catch(() => undefined);
  new Notice('ovaultd: pedido E2E de resolución procesado');
}
