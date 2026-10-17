import { App, PluginSettingTab, Setting } from 'obsidian';

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

    containerEl.createEl('h3', { text: 'Servidor y cuenta' });

    new Setting(containerEl)
      .setName('Servidor')
      .setDesc('URL base de tu servidor ovaultd (ej. https://sync.midominio.com).')
      .addText((texto) =>
        texto
          .setPlaceholder('https://…')
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
          .setPlaceholder('vos@ejemplo.com')
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
        texto.setPlaceholder('••••••••');
        texto.onChange((valor) => {
          this.passwordCuenta = valor;
        });
      });

    containerEl.createEl('h3', { text: 'Vault' });

    new Setting(containerEl)
      .setName('Número de vault')
      .setDesc('El # del vault en el servidor (si no lo sabés, empezá con 1).')
      .addText((texto) =>
        texto
          .setPlaceholder('1')
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
        texto.setPlaceholder('••••••••');
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
            await this.plugin.vincularVault({
              serverUrl: this.plugin.ajustes.serverUrl,
              email: this.plugin.ajustes.email,
              passwordCuenta: this.passwordCuenta,
              numero: Number.parseInt(this.plugin.ajustes.vaultNumero, 10),
              passwordVault: this.passwordVault,
            });
            this.passwordCuenta = '';
            this.passwordVault = '';
            this.display();
          }),
      );
  }
}
