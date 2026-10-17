/**
 * Operaciones de cuenta sobre las LLAVES de un vault:
 *
 *  - **Recuperar acceso** con la recovery key (cuando la password del vault se perdió): abre
 *    la envuelta de recovery, re-sella la envuelta de password con una nueva y vincula.
 *  - **Cambiar la password del vault** (con la actual): re-sella la envuelta.
 *  - **Borrar un vault** de la cuenta (confirmación fuerte: escribir su nombre exacto).
 *
 * Todo el manejo de claves ocurre acá; el servidor solo guarda envueltas (E2EE).
 */

import { App, Modal, Notice, Setting } from 'obsidian';
import type { VaultSummary } from '@ovaultd/protocol';

import type PluginOvaultd from './main';

interface BotonDeModal {
  setDisabled: (valor: boolean) => unknown;
  setButtonText: (texto: string) => unknown;
}

// ------------------------------------------------------------------ recuperar

class ModalDeRecuperar extends Modal {
  private recoveryHex = '';
  private passwordNueva = '';
  private confirmar = '';
  private trabajando = false;
  private aviso: HTMLElement | null = null;

  constructor(
    app: App,
    private readonly vault: { id: number; name: string },
    private readonly alRecuperar: (recoveryHex: string, passwordNueva: string) => Promise<void>,
  ) {
    super(app);
  }

  onOpen(): void {
    this.contentEl.createEl('h2', { text: `Recuperar «${this.vault.name}» (#${this.vault.id})` });
    this.contentEl.createEl('p', {
      text:
        'Usá la RECOVERY KEY que guardaste al crear el vault (64 caracteres hex). Recupera ' +
        'la clave de datos y define una password NUEVA: la que perdiste no se reconstruye, ' +
        'se reemplaza. Al terminar, esta carpeta queda vinculada con la nueva.',
    });

    new Setting(this.contentEl).setName('Recovery key').addText((texto) => {
      texto.onChange((valor) => {
        this.recoveryHex = valor;
      });
    });
    new Setting(this.contentEl).setName('Password NUEVA del vault').addText((texto) => {
      texto.inputEl.type = 'password';
      texto.onChange((valor) => {
        this.passwordNueva = valor;
      });
    });
    new Setting(this.contentEl).setName('Repetir password nueva').addText((texto) => {
      texto.inputEl.type = 'password';
      texto.onChange((valor) => {
        this.confirmar = valor;
      });
    });

    this.aviso = this.contentEl.createEl('p', { cls: 'mod-warning' });

    new Setting(this.contentEl).addButton((boton) =>
      boton
        .setButtonText('Recuperar y vincular')
        .setCta()
        .onClick(() => {
          void this.recuperar(boton);
        }),
    );
  }

  private async recuperar(boton: BotonDeModal): Promise<void> {
    if (this.trabajando) return;
    if (this.aviso) this.aviso.setText('');

    const error = (mensaje: string): void => {
      if (this.aviso) this.aviso.setText(mensaje);
    };

    if (!/^[0-9a-fA-F]{64}$/.test(this.recoveryHex.trim())) {
      return error('La recovery key son 64 caracteres hexadecimales.');
    }
    if (this.passwordNueva.length < 8) {
      return error('La password nueva necesita 8+ caracteres.');
    }
    if (this.passwordNueva !== this.confirmar) return error('Las passwords no coinciden.');

    this.trabajando = true;
    boton.setDisabled(true);
    boton.setButtonText('Recuperando…');
    try {
      await this.alRecuperar(this.recoveryHex.trim(), this.passwordNueva);
      this.close();
    } catch (elegido) {
      this.trabajando = false;
      boton.setDisabled(false);
      boton.setButtonText('Recuperar y vincular');
      error(`No se pudo recuperar: ${elegido instanceof Error ? elegido.message : String(elegido)}`);
    }
  }

  onClose(): void {
    this.contentEl.empty();
  }
}

// ------------------------------------------------------------------ cambiar password

class ModalDeCambiarPassword extends Modal {
  private actual = '';
  private nueva = '';
  private confirmar = '';
  private trabajando = false;
  private aviso: HTMLElement | null = null;

  constructor(
    app: App,
    private readonly vault: { numero: number; nombre: string },
    private readonly alCambiar: (actual: string, nueva: string) => Promise<void>,
  ) {
    super(app);
  }

  onOpen(): void {
    this.contentEl.createEl('h2', {
      text: `Cambiar la password de «${this.vault.nombre}» (#${this.vault.numero})`,
    });
    this.contentEl.createEl('p', {
      text:
        'Se valida la password actual y se re-sella la llave con la nueva. La recovery key ' +
        'sigue siendo la misma, y los datos no se recifran (solo cambia el sobre).',
    });

    new Setting(this.contentEl).setName('Password actual').addText((texto) => {
      texto.inputEl.type = 'password';
      texto.onChange((valor) => {
        this.actual = valor;
      });
    });
    new Setting(this.contentEl).setName('Password nueva').addText((texto) => {
      texto.inputEl.type = 'password';
      texto.onChange((valor) => {
        this.nueva = valor;
      });
    });
    new Setting(this.contentEl).setName('Repetir password nueva').addText((texto) => {
      texto.inputEl.type = 'password';
      texto.onChange((valor) => {
        this.confirmar = valor;
      });
    });

    this.aviso = this.contentEl.createEl('p', { cls: 'mod-warning' });

    new Setting(this.contentEl).addButton((boton) =>
      boton
        .setButtonText('Cambiar password')
        .setCta()
        .onClick(() => {
          void this.cambiar(boton);
        }),
    );
  }

  private async cambiar(boton: BotonDeModal): Promise<void> {
    if (this.trabajando) return;
    if (this.aviso) this.aviso.setText('');

    const error = (mensaje: string): void => {
      if (this.aviso) this.aviso.setText(mensaje);
    };

    if (this.actual.length === 0) return error('Poné tu password actual.');
    if (this.nueva.length < 8) return error('La password nueva necesita 8+ caracteres.');
    if (this.nueva !== this.confirmar) return error('Las passwords no coinciden.');

    this.trabajando = true;
    boton.setDisabled(true);
    boton.setButtonText('Cambiando…');
    try {
      await this.alCambiar(this.actual, this.nueva);
      this.close();
    } catch (elegido) {
      this.trabajando = false;
      boton.setDisabled(false);
      boton.setButtonText('Cambiar password');
      error(`No se pudo cambiar: ${elegido instanceof Error ? elegido.message : String(elegido)}`);
    }
  }

  onClose(): void {
    this.contentEl.empty();
  }
}

// ------------------------------------------------------------------ borrar

class ModalDeBorrado extends Modal {
  private confirmacion = '';
  private trabajando = false;
  private aviso: HTMLElement | null = null;

  constructor(
    app: App,
    private readonly vault: { id: number; name: string },
    private readonly alBorrar: () => Promise<void>,
  ) {
    super(app);
  }

  onOpen(): void {
    this.contentEl.createEl('h2', { text: `Borrar «${this.vault.name}» (#${this.vault.id})` });
    const advertir = this.contentEl.createEl('p', {
      text:
        'Esto borra el vault ENTERO del servidor: la historia, los blobs y los devices. ' +
        'Los archivos de tus carpetas locales NO se tocan, pero sin el vault no hay contra ' +
        'qué sincronizar (y sin la password/recovery no se puede volver a leer lo subido).',
    });
    advertir.addClass('mod-warning');

    this.contentEl.createEl('p', {
      text: `Para confirmar, escribí el nombre exacto del vault: «${this.vault.name}»`,
    });

    new Setting(this.contentEl).setName('Nombre del vault').addText((texto) => {
      texto.onChange((valor) => {
        this.confirmacion = valor;
      });
    });

    this.aviso = this.contentEl.createEl('p', { cls: 'mod-warning' });

    new Setting(this.contentEl).addButton((boton) =>
      boton
        .setButtonText('Borrar definitivamente')
        .setWarning()
        .onClick(() => {
          void this.borrar(boton);
        }),
    );
  }

  private async borrar(boton: BotonDeModal): Promise<void> {
    if (this.trabajando) return;
    if (this.aviso) this.aviso.setText('');

    if (this.confirmacion.trim() !== this.vault.name) {
      if (this.aviso) this.aviso.setText('El nombre no coincide exactamente.');
      return;
    }

    this.trabajando = true;
    boton.setDisabled(true);
    boton.setButtonText('Borrando…');
    try {
      await this.alBorrar();
      this.close();
    } catch (elegido) {
      this.trabajando = false;
      boton.setDisabled(false);
      boton.setButtonText('Borrar definitivamente');
      if (this.aviso) {
        this.aviso.setText(
          `No se pudo borrar: ${elegido instanceof Error ? elegido.message : String(elegido)}`,
        );
      }
    }
  }

  onClose(): void {
    this.contentEl.empty();
  }
}

// ------------------------------------------------------------------ abridores

export function abrirRecuperarVault(
  plugin: PluginOvaultd,
  vault: VaultSummary,
  alTerminar: () => void,
): void {
  new ModalDeRecuperar(plugin.app, vault, async (recoveryHex, passwordNueva) => {
    const mensaje = await plugin.motor.recuperarVault({
      numeroVault: vault.id,
      recoveryHex,
      passwordNueva,
    });
    new Notice(`ovaultd: ${mensaje}`, 8_000);
    alTerminar();
  }).open();
}

export function abrirCambiarPassword(plugin: PluginOvaultd, alTerminar: () => void): void {
  const vinculado = plugin.vaultVinculado;
  if (vinculado === null) {
    new Notice('ovaultd: no hay vault vinculado en esta carpeta.');
    return;
  }
  new ModalDeCambiarPassword(plugin.app, vinculado, async (actual, nueva) => {
    await plugin.motor.cambiarPasswordVault({
      numeroVault: vinculado.numero,
      passwordActual: actual,
      passwordNueva: nueva,
    });
    new Notice('ovaultd: password del vault cambiada. Guardala en tu gestor.', 8_000);
    alTerminar();
  }).open();
}

export function abrirBorradoVault(
  plugin: PluginOvaultd,
  vault: VaultSummary,
  alTerminar: () => void,
): void {
  new ModalDeBorrado(plugin.app, vault, async () => {
    await plugin.motor.borrarVault(vault.id, vault.name);
    new Notice(`ovaultd: vault #${vault.id} borrado del servidor.`, 8_000);
    alTerminar();
  }).open();
}
