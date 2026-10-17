import { App, PluginSettingTab, Setting } from 'obsidian';
import type PluginOvaultd from './main';

export interface AjustesDeOvaultd {
  /** URL base del servidor ovaultd, sin barra final (ej. https://sync.midominio.com). */
  serverUrl: string;
}

export const AJUSTES_POR_DEFECTO: AjustesDeOvaultd = {
  serverUrl: '',
};

export class TabAjustes extends PluginSettingTab {
  plugin: PluginOvaultd;

  constructor(app: App, plugin: PluginOvaultd) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

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
      .setName('Probar conexión')
      .setDesc('Le pega a /healthz con el mismo fetch del motor (pasa por CORS, sin atajos).')
      .addButton((boton) =>
        boton.setButtonText('Probar').onClick(async () => {
          await this.plugin.probarConexion();
        }),
      );
  }
}
