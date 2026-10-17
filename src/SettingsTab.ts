/**
 * Ajustes del plugin — el modelo tiene DOS niveles:
 *
 *  - **Cuenta** (sesión persistente): host + email + password UNA vez. Desde esa sesión se
 *    listan, crean y vinculan vaults; no se repiten credenciales.
 *  - **Carpeta**: a lo sumo UN vault vinculado (token + subclaves locales).
 *
 * La password del VAULT se pide al crear o vincular cada vault y NUNCA se persiste: es la
 * llave de cifrado (E2EE), no una credencial de sesión.
 */

import { App, Modal, Notice, PluginSettingTab, Setting } from 'obsidian';
import type { VaultSummary } from '@ovaultd/protocol';

import { comandoCrearVault, ModalDeVincular } from './CrearVault';
import { comandoExportar, comandoImportar } from './ExportImport';
import type PluginOvaultd from './main';

export interface AjustesDeOvaultd {
  /** URL base del servidor ovaultd, sin barra final (ej. https://sync.midominio.com). */
  serverUrl: string;
  /** Email de la cuenta (prefill del formulario; la password nunca se guarda). */
  email: string;
  /** Histórico: número de vault como texto (hoy la lista de la cuenta manda). */
  vaultNumero: string;
}

export const AJUSTES_POR_DEFECTO: AjustesDeOvaultd = {
  serverUrl: '',
  email: '',
  vaultNumero: '',
};

const FASE_A_TEXTO: Record<string, string> = {
  apagado: 'apagado',
  sincronizando: 'sincronizando…',
  'al-dia': 'al día',
  'con-conflictos': 'con conflictos',
  error: 'con error',
};

export class TabAjustes extends PluginSettingTab {
  plugin: PluginOvaultd;

  /** Password de cuenta SOLO en memoria mientras dura el formulario: nunca a disco. */
  private passwordCuenta = '';

  private vaultsDeLaCuenta: VaultSummary[] | null = null;
  private errorVaults: string | null = null;
  private cargandoVaults = false;

  constructor(app: App, plugin: PluginOvaultd) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    const estado = this.plugin.motorEstado;
    const vinculado = this.plugin.motorVinculado;
    const sesion = this.plugin.cuentaConectada;

    // ---------------------------------------------------------------- estado
    containerEl.createEl('p', {
      text: vinculado
        ? `Vinculado: ${estado.detalle}`
        : sesion
          ? 'Cuenta conectada. Creá un vault nuevo o vinculá uno existente.'
          : 'Conectá tu cuenta para empezar: un login y después todo se maneja desde acá.',
    });
    if (vinculado) {
      containerEl.createEl('p', {
        text: `Fase: ${FASE_A_TEXTO[estado.fase] ?? estado.fase}${estado.ultimaSync ? ` · última sync: ${new Date(estado.ultimaSync).toLocaleTimeString()}` : ''}`,
      });
    }

    new Setting(containerEl)
      .setName('Sincronizar ahora')
      .setDesc('Corre un ciclo completo (pull → push) a demanda.')
      .addButton((boton) =>
        boton.setButtonText('Sincronizar').onClick(async () => {
          await this.plugin.sincronizarAhora();
          this.display();
        }),
      );

    // ---------------------------------------------------------------- cuenta
    containerEl.createEl('h3', { text: 'Cuenta' });

    if (sesion) {
      new Setting(containerEl)
        .setName('Conectado')
        .setDesc(`${sesion.email} en ${sesion.serverUrl}`)
        .addButton((boton) =>
          boton.setButtonText('Salir').setWarning().onClick(async () => {
            await this.plugin.motor.salir();
            this.vaultsDeLaCuenta = null;
            this.errorVaults = null;
            new Notice('ovaultd: sesión cerrada.');
            this.display();
          }),
        );
    } else {
      new Setting(containerEl)
        .setName('Servidor')
        .setDesc('URL base de tu servidor ovaultd (ej. https://sync.midominio.com).')
        .addText((texto) =>
          texto.setValue(this.plugin.ajustes.serverUrl).onChange(async (valor) => {
            this.plugin.ajustes.serverUrl = valor.trim();
            await this.plugin.guardarAjustes();
          }),
        );

      new Setting(containerEl)
        .setName('Email')
        .setDesc('La cuenta del servidor (bootstrap /setup, o la que te cree el admin).')
        .addText((texto) =>
          texto.setValue(this.plugin.ajustes.email).onChange(async (valor) => {
            this.plugin.ajustes.email = valor.trim();
            await this.plugin.guardarAjustes();
          }),
        );

      new Setting(containerEl)
        .setName('Password de la cuenta')
        .setDesc('Solo viaja al login de este device: no se guarda.')
        .addText((texto) => {
          texto.inputEl.type = 'password';
          texto.onChange((valor) => {
            this.passwordCuenta = valor;
          });
        });

      new Setting(containerEl)
        .setName('Entrar')
        .setDesc('UNA vez: después creás y vinculás vaults sin repetir credenciales.')
        .addButton((boton) =>
          boton.setButtonText('Entrar').setCta().onClick(async () => {
            const ok = await this.plugin.entrarCuenta({
              serverUrl: this.plugin.ajustes.serverUrl,
              email: this.plugin.ajustes.email,
              passwordCuenta: this.passwordCuenta,
            });
            if (ok) {
              this.passwordCuenta = '';
              this.vaultsDeLaCuenta = null;
              this.errorVaults = null;
              this.display();
            }
          }),
        );
    }

    // ---------------------------------------------------------------- vaults
    if (sesion) {
      containerEl.createEl('h3', { text: 'Vaults de tu cuenta' });

      new Setting(containerEl)
        .setName('Crear un vault nuevo')
        .setDesc(
          'Nombre y password de cifrado: el material se genera en este equipo y el ' +
            'servidor nunca ve tu password. Después esta carpeta se sube sola.',
        )
        .addButton((boton) =>
          boton.setButtonText('Crear vault…').onClick(() => {
            void comandoCrearVault(this.plugin);
          }),
        );

      this.pintarVaults(containerEl, vinculado);
    }

    // ---------------------------------------------------------------- carpeta
    if (vinculado) {
      containerEl.createEl('h3', { text: 'Esta carpeta' });
      new Setting(containerEl)
        .setName('Carpeta vinculada')
        .setDesc(
          `${estado.detalle}. Soltar el vínculo borra el estado local (subclaves e índice) ` +
            'de este equipo; la cuenta y los datos del servidor no se tocan.',
        )
        .addButton((boton) =>
          boton.setButtonText('Desvincular').setWarning().onClick(() => {
            new ModalDeDesvinculo(this.app, async () => {
              await this.plugin.motor.desvincular();
              new Notice('ovaultd: carpeta desvinculada.');
              this.display();
            }).open();
          }),
        );
    }

    // ---------------------------------------------------------------- export / import
    containerEl.createEl('h3', { text: 'Export / Import' });

    new Setting(containerEl)
      .setName('Exportar el vault a una carpeta')
      .setDesc(
        'Baja TODO el vault remoto y lo escribe descifrado en la carpeta que elijas ' +
          '(los que ya existan se omiten). Solo app de escritorio.',
      )
      .addButton((boton) =>
        boton.setButtonText('Exportar…').onClick(() => {
          comandoExportar(this.plugin);
        }),
      );

    new Setting(containerEl)
      .setName('Importar una carpeta al vault')
      .setDesc(
        'Copia los archivos de una carpeta al vault (dotfiles y basura de dev quedan afuera; ' +
          'lo existente no se pisa). Después el motor los sube solo.',
      )
      .addButton((boton) =>
        boton.setButtonText('Importar…').onClick(() => {
          comandoImportar(this.plugin);
        }),
      );
  }

  /** Lista de vaults de la cuenta: carga sola la primera vez y marca el vinculado. */
  private pintarVaults(containerEl: HTMLElement, vinculado: boolean): void {
    if (this.vaultsDeLaCuenta === null) {
      if (this.errorVaults !== null) {
        containerEl.createEl('p', { text: `No pude cargar los vaults: ${this.errorVaults}` });
        new Setting(containerEl).addButton((boton) =>
          boton.setButtonText('Reintentar').onClick(() => {
            this.errorVaults = null;
            this.display();
          }),
        );
      } else {
        containerEl.createEl('p', { text: 'Cargando vaults…' });
        if (!this.cargandoVaults) void this.cargarVaults();
      }
      return;
    }

    if (this.vaultsDeLaCuenta.length === 0) {
      containerEl.createEl('p', {
        text: 'La cuenta todavía no tiene vaults: creá el primero con «Crear vault…».',
      });
      return;
    }

    const actual = this.plugin.vaultVinculado;
    for (const vault of this.vaultsDeLaCuenta) {
      const setting = new Setting(containerEl).setName(`#${vault.id} «${vault.name}»`);
      if (vinculado && actual !== null && actual.numero === vault.id) {
        setting.setDesc('Vinculado a esta carpeta ✓');
      } else {
        setting.setDesc('Vault de tu cuenta.').addButton((boton) =>
          boton.setButtonText('Vincular…').onClick(() => {
            if (this.plugin.motorVinculado) {
              new Notice(
                'ovaultd: esta carpeta ya está vinculada — desvinculá primero (abajo).',
                8_000,
              );
              return;
            }
            new ModalDeVincular(this.plugin, vault, async (passwordVault) => {
              const ok = await this.plugin.vincularVault({ numero: vault.id, passwordVault });
              if (ok) this.display();
            }).open();
          }),
        );
      }
    }

    new Setting(containerEl).addButton((boton) =>
      boton.setButtonText('Refrescar lista').onClick(() => {
        this.vaultsDeLaCuenta = null;
        this.errorVaults = null;
        this.display();
      }),
    );
  }

  private async cargarVaults(): Promise<void> {
    if (this.cargandoVaults) return;
    this.cargandoVaults = true;
    try {
      this.vaultsDeLaCuenta = await this.plugin.motor.listarVaultsDeLaCuenta();
      this.errorVaults = null;
    } catch (error) {
      this.errorVaults = error instanceof Error ? error.message : String(error);
    } finally {
      this.cargandoVaults = false;
      this.display();
    }
  }
}

/** Confirmación del desvínculo: una acción con consecuencias, sin sorpresas. */
class ModalDeDesvinculo extends Modal {
  constructor(
    app: App,
    private readonly alConfirmar: () => Promise<void>,
  ) {
    super(app);
  }

  onOpen(): void {
    this.contentEl.createEl('h2', { text: 'Desvincular esta carpeta' });
    this.contentEl.createEl('p', {
      text:
        'Se borra el estado local (subclaves e índice de sincronización) de este equipo. ' +
        'La sesión de cuenta queda, y los datos del servidor no se tocan: para volver a ' +
        'vincular solo necesitás la password del vault.',
    });
    new Setting(this.contentEl)
      .addButton((boton) => boton.setButtonText('Cancelar').onClick(() => this.close()))
      .addButton((boton) =>
        boton
          .setButtonText('Desvincular')
          .setWarning()
          .onClick(() => {
            this.close();
            void this.alConfirmar();
          }),
      );
  }

  onClose(): void {
    this.contentEl.empty();
  }
}
