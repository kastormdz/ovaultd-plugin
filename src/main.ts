import { Notice, Plugin } from 'obsidian';

import { AdaptadorDeArchivos, PuenteDeEventos, type CambioDeVault } from './ObsidianFileAdapter';
import { AjustesDeOvaultd, AJUSTES_POR_DEFECTO, TabAjustes } from './SettingsTab';
import { RegistroDeSpike } from './spikeEventos';

const REANUDADO_MIN_MS = 20_000;

/**
 * Corte 2 de la fase 3: el adaptador del vault (`FileSystemPort` del core) + el puente
 * de eventos (coalescer + journal de escrituras propias) viven acá.
 *
 * Lo que este corte NO hace todavía: reconciliar ni publicar (el motor llega en el
 * próximo corte). Por ahora el puente cuenta cambios, filtra los que causó nuestra
 * propia escritura (por hash esperado) y el spike los registra para medir coalescing.
 */
export default class PluginOvaultd extends Plugin {
  ajustes!: AjustesDeOvaultd;
  adaptador!: AdaptadorDeArchivos;
  puente!: PuenteDeEventos;

  private spike: RegistroDeSpike | null = null;
  private estadoEl!: HTMLElement;
  private contadorCambios = 0;
  private ultimoAviso = 0;

  async onload(): Promise<void> {
    await this.cargarAjustes();

    this.estadoEl = this.addStatusBarItem();
    this.estadoEl.setText('ovaultd: puente OK · 0 cambios');

    this.adaptador = new AdaptadorDeArchivos(this.app.vault.adapter);
    this.puente = new PuenteDeEventos(this.app.vault, {
      onCambio: (cambio) => this.alCambiar(cambio),
      esCambioPropio: (cambio) =>
        'path' in cambio
          ? this.adaptador.esCambioPropio(
              cambio.path,
              cambio.tipo,
              cambio.tipo === 'renombrado' ? cambio.oldPath : undefined,
            )
          : Promise.resolve(false),
      onDescartado: (cambio) => this.spike?.registrarCoalescido(cambio, true),
    });
    this.puente.iniciar();

    this.addSettingTab(new TabAjustes(this.app, this));

    this.addCommand({
      id: 'probar-conexion',
      name: 'Probar conexión con el servidor',
      callback: () => {
        void this.probarConexion();
      },
    });

    this.addCommand({
      id: 'puente-estado',
      name: 'Estado del puente de eventos',
      callback: () => {
        new Notice(
          `ovaultd: puente ${this.puente.pendientesRestantes()} pendientes · ${this.contadorCambios} cambios emitidos · spike ${this.spike !== null ? 'activo' : 'apagado'}`,
        );
      },
    });

    this.addCommand({
      id: 'spike-iniciar',
      name: 'Spike: iniciar registro de eventos',
      callback: () => {
        void this.iniciarSpike();
      },
    });

    this.addCommand({
      id: 'spike-detener',
      name: 'Spike: detener registro de eventos',
      callback: () => {
        void this.detenerSpike();
      },
    });

    // Arranque y reanudación (plan de fase 3, paso 2): avisos globales sin path.
    this.app.workspace.onLayoutReady(() => this.puente.avisar('inicio'));
    this.registerDomEvent(window, 'focus', () => {
      const ahora = Date.now();
      if (ahora - this.ultimoAviso < REANUDADO_MIN_MS) return;
      this.ultimoAviso = ahora;
      this.puente.avisar('reanudado');
    });

    // El spike se auto-activa si el marcador está junto al plugin (para medir sin UI).
    if (await RegistroDeSpike.marcadorActivo(this.app.vault.adapter)) {
      await this.iniciarSpike();
    }

    if (this.ajustes.serverUrl !== '') {
      void this.probarConexion();
    }
  }

  onunload(): void {
    this.spike?.detener();
    this.puente.detener();
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

  private alCambiar(cambio: CambioDeVault): void {
    this.contadorCambios += 1;
    this.estadoEl.setText(`ovaultd: puente OK · ${this.contadorCambios} cambios`);
    this.spike?.registrarCoalescido(cambio, false);
    console.debug('ovaultd: cambio de vault', cambio);
  }

  async iniciarSpike(): Promise<void> {
    if (this.spike !== null) return;
    this.spike = new RegistroDeSpike(this.app.vault, this.app.vault.adapter);
    this.spike.iniciar();
    const dir = this.manifest.dir ?? '.obsidian/plugins/ovaultd';
    await this.app.vault.adapter
      .append(`${dir}/spike.activo`, `${new Date().toISOString()}\n`)
      .catch(() => undefined);
    new Notice('ovaultd: spike de eventos ACTIVO (log en .obsidian/plugins/ovaultd/spike.jsonl)');
  }

  async detenerSpike(): Promise<void> {
    if (this.spike === null) return;
    this.spike.detener();
    this.spike = null;
    const dir = this.manifest.dir ?? '.obsidian/plugins/ovaultd';
    await this.app.vault.adapter.remove(`${dir}/spike.activo`).catch(() => undefined);
    new Notice('ovaultd: spike de eventos detenido');
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

    try {
      const respuesta = await fetch(`${base}/healthz`, { cache: 'no-store' });
      const cuerpo = (await respuesta.json()) as { status?: string };

      if (respuesta.ok && cuerpo.status === 'ok') {
        new Notice('ovaultd: el servidor responde.');
      } else {
        new Notice(`ovaultd: respuesta inesperada (${respuesta.status})`);
      }
    } catch (error) {
      new Notice(`ovaultd: no pude hablar con el servidor — ${String(error)}`);
    }
  }
}
