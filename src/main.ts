import { Notice, Plugin } from 'obsidian';
import { AjustesDeOvaultd, AJUSTES_POR_DEFECTO, TabAjustes } from './SettingsTab';

/**
 * Shell del plugin (corte 1 de la fase 3): ciclo de vida, ajustes, barra de estado y
 * una verificación de conexión REAL contra `/healthz` — con el mismo `fetch` que va a
 * usar el motor, o sea por CORS y desde el origen `app://obsidian.md`.
 *
 * Lo que todavía NO vive acá: el adaptador del vault, el motor de reconciliación, el
 * merge y las vistas. Esos cortes llegan con el core (`@ovaultd/core`) montado encima.
 */
export default class PluginOvaultd extends Plugin {
  ajustes!: AjustesDeOvaultd;
  private estadoEl!: HTMLElement;

  async onload(): Promise<void> {
    await this.cargarAjustes();

    this.estadoEl = this.addStatusBarItem();
    this.estadoEl.setText('ovaultd: sin configurar');

    this.addSettingTab(new TabAjustes(this.app, this));

    this.addCommand({
      id: 'probar-conexion',
      name: 'Probar conexión con el servidor',
      callback: () => {
        void this.probarConexion();
      },
    });

    if (this.ajustes.serverUrl !== '') {
      void this.probarConexion();
    }
  }

  async cargarAjustes(): Promise<void> {
    const guardados = (await this.loadData()) as Partial<AjustesDeOvaultd> | null;
    this.ajustes = { ...AJUSTES_POR_DEFECTO, ...(guardados ?? {}) };
  }

  async guardarAjustes(): Promise<void> {
    await this.saveData(this.ajustes);
  }

  mostrarEstado(texto: string): void {
    this.estadoEl.setText(texto);
  }

  /**
   * GET /healthz con `fetch` crudo (no `requestUrl`, que esquiva CORS): queremos
   * probar EXACTAMENTE el camino del motor. Si esto falla en un dispositivo, el
   * motor también va a fallar ahí.
   */
  async probarConexion(): Promise<void> {
    const base = this.ajustes.serverUrl.trim().replace(/\/+$/, '');
    if (base === '') {
      this.mostrarEstado('ovaultd: sin configurar');
      new Notice('ovaultd: configurá la URL del servidor primero.');
      return;
    }

    this.mostrarEstado('ovaultd: conectando…');
    try {
      const respuesta = await fetch(`${base}/healthz`, { cache: 'no-store' });
      const cuerpo = (await respuesta.json()) as { status?: string };

      if (respuesta.ok && cuerpo.status === 'ok') {
        this.mostrarEstado('ovaultd: servidor OK');
        new Notice('ovaultd: el servidor responde.');
      } else {
        this.mostrarEstado(`ovaultd: respuesta inesperada (${respuesta.status})`);
      }
    } catch (error) {
      this.mostrarEstado('ovaultd: sin conexión');
      new Notice(`ovaultd: no pude hablar con el servidor — ${String(error)}`);
    }
  }
}
