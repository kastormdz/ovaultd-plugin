/**
 * «Crear vault nuevo…» y «Vincular…» — ambas operaciones viven en la SESIÓN de cuenta:
 * las credenciales de cuenta NO se piden acá (ya entraste una vez en Ajustes → Cuenta);
 * lo único que se pide es la password de CIFRADO del vault (al crear: la inventás vos;
 * al vincular: la del vault que ya existe).
 *
 * El material se genera LOCALMENTE y el servidor solo recibe el material público (salt,
 * wrap, pubkey, uuid). La recovery key se muestra UNA vez.
 */

import { Modal, Notice, Setting, type App } from 'obsidian';

import type PluginOvaultd from './main';

class ModalDeCreacion extends Modal {
  private nombre = '';
  private passwordVault = '';
  private confirmar = '';
  private creando = false;
  private aviso: HTMLElement | null = null;

  constructor(
    app: App,
    private readonly alCrear: (datos: { nombre: string; passwordVault: string }) => Promise<void>,
  ) {
    super(app);
  }

  onOpen(): void {
    this.contentEl.createEl('h2', { text: 'Crear vault nuevo' });
    this.contentEl.createEl('p', {
      text:
        'Vas a crear un vault NUEVO: la password de cifrado la INVENTÁS acá (nadie te la ' +
        'puede dar — el servidor nunca la ve, es la que abre tus datos y no se puede ' +
        'recuperar). Guardala en tu gestor de contraseñas antes de seguir.',
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

  private async crear(boton: {
    setDisabled: (valor: boolean) => unknown;
    setButtonText: (texto: string) => unknown;
  }): Promise<void> {
    if (this.creando) return;
    if (this.aviso) this.aviso.setText('');

    const error = (mensaje: string): void => {
      if (this.aviso) this.aviso.setText(mensaje);
    };

    if (this.nombre.trim() === '') return error('Poné un nombre para el vault.');
    if (this.passwordVault.length < 8) return error('La password del vault necesita 8+ caracteres.');
    if (this.passwordVault !== this.confirmar) return error('Las passwords no coinciden.');

    this.creando = true;
    boton.setDisabled(true);
    boton.setButtonText('Creando…');
    try {
      await this.alCrear({ nombre: this.nombre.trim(), passwordVault: this.passwordVault });
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

/** Vínculo de un vault de la cuenta a esta carpeta: solo pide su password de cifrado. */
export class ModalDeVincular extends Modal {
  private passwordVault = '';
  private vinculando = false;
  private aviso: HTMLElement | null = null;

  constructor(
    private readonly plugin: PluginOvaultd,
    private readonly vault: { id: number; name: string },
    private readonly alVincular: (passwordVault: string) => Promise<void>,
  ) {
    super(plugin.app);
  }

  onOpen(): void {
    this.contentEl.createEl('h2', { text: `Vincular «${this.vault.name}» (#${this.vault.id})` });
    this.contentEl.createEl('p', {
      text:
        'La password de cifrado descifra el material del vault LOCALMENTE (KEK → unwrap): ' +
        'el servidor nunca la ve. Con esto esta carpeta queda vinculada y empieza el sync.',
    });

    new Setting(this.contentEl)
      .setName('Password de cifrado del vault')
      .addText((texto) => {
        texto.inputEl.type = 'password';
        texto.onChange((valor) => {
          this.passwordVault = valor;
        });
      });

    this.aviso = this.contentEl.createEl('p', { cls: 'mod-warning' });

    new Setting(this.contentEl).addButton((boton) =>
      boton
        .setButtonText('Vincular')
        .setCta()
        .onClick(() => {
          void this.vincular(boton);
        }),
    );
  }

  private async vincular(boton: {
    setDisabled: (valor: boolean) => unknown;
    setButtonText: (texto: string) => unknown;
  }): Promise<void> {
    if (this.vinculando) return;
    if (this.passwordVault.length === 0) {
      if (this.aviso) this.aviso.setText('Falta la password del vault.');
      return;
    }
    this.vinculando = true;
    boton.setDisabled(true);
    boton.setButtonText('Vinculando…');
    try {
      await this.alVincular(this.passwordVault);
      this.close();
    } catch (elegido) {
      this.vinculando = false;
      boton.setDisabled(false);
      boton.setButtonText('Vincular');
      if (this.aviso) {
        this.aviso.setText(
          `No se pudo vincular: ${elegido instanceof Error ? elegido.message : String(elegido)}`,
        );
      }
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
    codigo.addClass('ovaultd-recovery');

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
  if (plugin.cuentaConectada === null) {
    new Notice('ovaultd: entrá con tu cuenta primero (Ajustes → Cuenta).', 8_000);
    return;
  }
  if (plugin.motor.vinculado) {
    new Notice(
      'ovaultd: esta carpeta ya está vinculada a un vault. Desvinculá primero para crear otro.',
      8_000,
    );
    return;
  }

  new ModalDeCreacion(plugin.app, async (datos) => {
    const { id, recoveryHex } = await plugin.motor.crearVault(datos);
    new Notice(`ovaultd: vault #${id} creado y vinculado. Sincronizando…`, 8_000);
    new ModalDeRecovery(plugin.app, { id, nombre: datos.nombre, recoveryHex }).open();
  }).open();
}
