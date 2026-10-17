/**
 * «Crear vault nuevo…» — el alta completa ocurre en el plugin: nombre, cuenta y password
 * de cifrado se eligen acá; el material se genera LOCALMENTE y el servidor solo recibe el
 * material público (salt, wrap, pubkey, uuid). La recovery key se muestra UNA vez.
 *
 * Es el cierre del círculo: cuenta en la web → vault desde Obsidian → sync.
 */

import { Modal, Notice, Setting, type App } from 'obsidian';

import type PluginOvaultd from './main';

class ModalDeCreacion extends Modal {
  private serverUrl: string;
  private email = '';
  private nombre = '';
  private passwordCuenta = '';
  private passwordVault = '';
  private confirmar = '';
  private creando = false;
  private aviso: HTMLElement | null = null;

  constructor(
    app: App,
    serverUrlInicial: string,
    private readonly alCrear: (datos: {
      serverUrl: string;
      email: string;
      passwordCuenta: string;
      nombre: string;
      passwordVault: string;
    }) => Promise<void>,
  ) {
    super(app);
    this.serverUrl = serverUrlInicial;
  }

  onOpen(): void {
    this.contentEl.createEl('h2', { text: 'Crear vault nuevo' });
    this.contentEl.createEl('p', {
      text:
        'Vas a crear un vault NUEVO: la password de cifrado la INVENTÁS acá (nadie te la ' +
        'puede dar — el servidor nunca la ve, es la que abre tus datos y no se puede ' +
        'recuperar). Guardala en tu gestor de contraseñas antes de seguir.',
    });

    new Setting(this.contentEl).setName('Servidor').addText((texto) =>
      texto
        .setValue(this.serverUrl)
        .onChange((valor) => {
          this.serverUrl = valor;
        }),
    );
    new Setting(this.contentEl).setName('Email de la cuenta').addText((texto) =>
      texto.onChange((valor) => {
        this.email = valor;
      }),
    );
    new Setting(this.contentEl).setName('Password de la cuenta').addText((texto) => {
      texto.inputEl.type = 'password';
      texto.onChange((valor) => {
        this.passwordCuenta = valor;
      });
    });
    new Setting(this.contentEl).setName('Nombre del vault').addText((texto) =>
      texto.onChange((valor) => {
        this.nombre = valor;
      }),
    );
    new Setting(this.contentEl)
      .setName('Password de cifrado del vault')
      .setDesc('Protege tu clave de datos. Si la perdés, solo la recovery key lo abre.')
      .addText((texto) => {
        texto.inputEl.type = 'password';
        texto.onChange((valor) => {
          this.passwordVault = valor;
        });
      });
    new Setting(this.contentEl).setName('Repetir password').addText((texto) => {
      texto.inputEl.type = 'password';
      texto.onChange((valor) => {
        this.confirmar = valor;
      });
    });

    this.aviso = this.contentEl.createEl('p', { cls: 'mod-warning' });

    new Setting(this.contentEl).addButton((boton) =>
      boton
        .setButtonText('Crear vault')
        .setCta()
        .onClick(() => {
          void this.crear(boton);
        }),
    );
  }

  private async crear(boton: { setDisabled: (valor: boolean) => unknown; setButtonText: (texto: string) => unknown }): Promise<void> {
    if (this.creando) return;
    if (this.aviso) this.aviso.setText('');

    const error = (mensaje: string): void => {
      if (this.aviso) this.aviso.setText(mensaje);
    };

    if (this.serverUrl.trim() === '') return error('Falta el servidor.');
    if (!this.email.includes('@')) return error('Ese email no parece válido.');
    if (this.passwordCuenta.length < 8) return error('La password de la cuenta necesita 8+ caracteres.');
    if (this.nombre.trim() === '') return error('Poné un nombre para el vault.');
    if (this.passwordVault.length < 8) return error('La password del vault necesita 8+ caracteres.');
    if (this.passwordVault !== this.confirmar) return error('Las passwords no coinciden.');

    this.creando = true;
    boton.setDisabled(true);
    boton.setButtonText('Creando…');
    try {
      await this.alCrear({
        serverUrl: this.serverUrl,
        email: this.email.trim(),
        passwordCuenta: this.passwordCuenta,
        nombre: this.nombre.trim(),
        passwordVault: this.passwordVault,
      });
      this.close();
    } catch (elegido) {
      this.creando = false;
      boton.setDisabled(false);
      boton.setButtonText('Crear vault');
      error(`No se pudo crear: ${elegido instanceof Error ? elegido.message : String(elegido)}`);
    }
  }

  onClose(): void {
    this.contentEl.empty();
  }
}

class ModalDeRecovery extends Modal {
  constructor(
    app: App,
    private readonly datos: { id: number; nombre: string; recoveryHex: string },
  ) {
    super(app);
  }

  onOpen(): void {
    this.contentEl.createEl('h2', { text: 'Vault creado 🎉' });
    this.contentEl.createEl('p', {
      text:
        `«${this.datos.nombre}» quedó como vault #${this.datos.id} y esta carpeta ya está ` +
        'vinculada: el primer ciclo va a subir lo que tengas acá.',
    });
    this.contentEl.createEl('p', {
      text:
        'Esta es tu RECOVERY KEY. No se vuelve a mostrar y es la única forma de abrir el ' +
        'vault si olvidás la password. Guardala FUERA de este equipo (gestor de secretos).',
    });
    const codigo = this.contentEl.createEl('pre');
    codigo.setText(this.datos.recoveryHex);
    codigo.style.userSelect = 'all';

    new Setting(this.contentEl).addButton((boton) =>
      boton.setButtonText('Copiar').onClick(() => {
        void navigator.clipboard.writeText(this.datos.recoveryHex);
        boton.setButtonText('Copiada ✓');
      }),
    );
  }

  onClose(): void {
    this.contentEl.empty();
  }
}

/** Comando de paleta/opciones: alta completa de un vault desde esta carpeta. */
export async function comandoCrearVault(plugin: PluginOvaultd): Promise<void> {
  if (plugin.motor.vinculado) {
    new Notice(
      'ovaultd: esta carpeta ya está vinculada a un vault. Desvinculá primero para crear otro.',
      8_000,
    );
    return;
  }

  new ModalDeCreacion(plugin.app, plugin.ajustes.serverUrl, async (datos) => {
    const { id, recoveryHex } = await plugin.motor.crearVault(datos);
    new Notice(`ovaultd: vault #${id} creado y vinculado. Sincronizando…`, 8_000);
    new ModalDeRecovery(plugin.app, { id, nombre: datos.nombre, recoveryHex }).open();
  }).open();
}
