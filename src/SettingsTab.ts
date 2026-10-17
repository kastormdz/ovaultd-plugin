import { App, Modal, Notice, PluginSettingTab, Setting } from 'obsidian';

import { comandoExportar, comandoImportar } from './ExportImport';
import { comandoCrearVault } from './CrearVault';
import type PluginOvaultd from './main';

export interface AjustesDeOvaultd {
  /** URL base del servidor ovaultd, sin barra final (ej. https://sync.midominio.com). */
  serverUrl: string;
  /** Email de la cuenta (solo informativo; la password vive únicamente en el formulario). */
  email: string;
  /** Número de vault remoto, como texto de UI (se parsea al vincular). */
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

  /** Passwords SOLO en memoria mientras dure el formulario: nunca a disco. */
  private passwordCuenta = '';
  private passwordVault = '';

  constructor(app: App, plugin: PluginOvaultd) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    const estado = this.plugin.motorEstado;
    const vinculado = this.plugin.motorVinculado;

    // ---------------------------------------------------------------- estado
    containerEl.createEl('p', {
      text: vinculado
        ? `Vinculado: ${estado.detalle}`
        : 'Sin vincular: completá servidor, cuenta y vault, y usá «Vincular».',
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

    containerEl.createEl('h3', { text: 'Vault' });

    if (vinculado) {
      new Setting(containerEl)
        .setName('Carpeta vinculada')
        .setDesc(
          `${estado.detalle}. Soltar el vínculo borra el estado local (sesión, subclaves e ` +
            'índice) de este equipo; los datos del servidor no se tocan.',
        )
        .addButton((boton) =>
          boton.setButtonText('Desvincular').setWarning().onClick(() => {
            new ModalDeDesvinculo(this.app, async () => {
              await this.plugin.motor.desvincular();
              new Notice('ovaultd: carpeta desvinculada. Podés crear o vincular otro vault.');
              this.display();
            }).open();
          }),
        );
    } else {
      new Setting(containerEl)
        .setName('Crear un vault nuevo')
        .setDesc(
          'Alta completa desde acá: elegís nombre y password de cifrado, el material se genera ' +
            'en este equipo y el servidor nunca ve tu password. Después esta carpeta se sube sola.',
        )
        .addButton((boton) =>
          boton.setButtonText('Crear vault…').onClick(() => {
            void comandoCrearVault(this.plugin);
          }),
        );
    }

    containerEl.createEl('h3', { text: 'Vincular a un vault existente' });

    new Setting(containerEl)
      .setName('Servidor')
      .setDesc('URL base de tu servidor ovaultd (ej. https://sync.midominio.com).')
      .addText((texto) =>
        texto
          .setValue(this.plugin.ajustes.serverUrl)
          .onChange(async (valor) => {
            this.plugin.ajustes.serverUrl = valor.trim();
            await this.plugin.guardarAjustes();
          }),
      );

    new Setting(containerEl)
      .setName('Email de la cuenta')
      .setDesc('La cuenta del servidor (la crea el admin con ovaultd-admin, o el bootstrap /setup).')
      .addText((texto) =>
        texto
          .setValue(this.plugin.ajustes.email)
          .onChange(async (valor) => {
            this.plugin.ajustes.email = valor.trim();
            await this.plugin.guardarAjustes();
          }),
      );

    new Setting(containerEl)
      .setName('Password de la cuenta')
      .setDesc('Para el login de este device. Solo vive en este formulario: no se guarda.')
      .addText((texto) => {
        texto.inputEl.type = 'password';
        texto.onChange((valor) => {
          this.passwordCuenta = valor;
        });
      });

    new Setting(containerEl)
      .setName('Número de vault')
      .setDesc('El # del vault EXISTENTE a vincular (los vaults nuevos se crean con «Crear un vault nuevo», arriba).')
      .addText((texto) =>
        texto
          .setValue(this.plugin.ajustes.vaultNumero)
          .onChange(async (valor) => {
            this.plugin.ajustes.vaultNumero = valor.trim();
            await this.plugin.guardarAjustes();
          }),
      );

    new Setting(containerEl)
      .setName('Password del vault')
      .setDesc(
        'Descifra el material localmente (KEK → unwrap): el servidor nunca la ve. ' +
          'La derivación es lenta a propósito (~1 s): es tu passphrase, no una sesión.',
      )
      .addText((texto) => {
        texto.inputEl.type = 'password';
        texto.onChange((valor) => {
          this.passwordVault = valor;
        });
      });

    new Setting(containerEl)
      .setName(vinculado ? 'Re-vincular' : 'Vincular')
      .setDesc(
        vinculado
          ? 'Vuelve a hacer login (renueva el token) y re-descifra el material con la password de arriba.'
          : 'Login + material del vault + subclaves. Con esto el motor queda andando.',
      )
      .addButton((boton) =>
        boton
          .setButtonText(vinculado ? 'Re-vincular' : 'Vincular')
          .setCta()
          .onClick(async () => {
            const vinculo = await this.plugin.vincularVault({
              serverUrl: this.plugin.ajustes.serverUrl,
              email: this.plugin.ajustes.email,
              passwordCuenta: this.passwordCuenta,
              numero: Number.parseInt(this.plugin.ajustes.vaultNumero, 10),
              passwordVault: this.passwordVault,
            });
            // Solo con ÉXITO se limpia y se redibuja: un fallo deja TODO lo escrito intacto.
            if (vinculo) {
              this.passwordCuenta = '';
              this.passwordVault = '';
              this.display();
            }
          }),
      );
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
        'Se borra el estado local (sesión, subclaves e índice de sincronización) de este ' +
        'equipo. Los datos del servidor no se tocan: para volver a vincular necesitás la ' +
        'password del vault.',
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
