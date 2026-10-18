/**
 * Reintento del arranque: un iniciar() fallido (red caída al abrir Obsidian, server
 * reiniciando, carrera de challenges) reprograma el arranque solo — antes el motor quedaba
 * muerto hasta un toggle manual, porque el timer de rescate recién existe con el motor ya
 * arrancado y nada más reintentaba.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';

import { MotorDeSync } from '../src/sync-engine';

const RUTA_ESTADO = '.obsidian/plugins/ovaultd/estado-local.json';

/** Vault de mentira con el estado local escrito: el arranque pasa la lectura y falla después. */
function appConEstado() {
  const archivos = new Map<string, string>();
  const estado = {
    serverUrl: 'http://127.0.0.1:9',
    cuenta: { email: 'quien@ejemplo.com', token: 'token-de-prueba', deviceId: 1 },
    vault: {
      numero: 1,
      nombre: 'Prueba',
      vaultUuidB64: 'AAAAAAAAAAAAAAAAAAAAAA',
      epoch: 1,
      subclaves: {
        content: 'aa'.repeat(32),
        nonce: 'bb'.repeat(32),
        path: 'cc'.repeat(32),
        meta: 'dd'.repeat(32),
        bind: 'ee'.repeat(32),
        sign: 'ff'.repeat(32),
      },
    },
  };
  archivos.set(RUTA_ESTADO, JSON.stringify(estado));

  return {
    archivos,
    app: {
      vault: {
        configDir: '.obsidian',
        adapter: {
          async read(ruta: string) {
            const contenido = archivos.get(ruta);
            if (contenido === undefined) throw new Error('no existe');
            return contenido;
          },
          async write(ruta: string, contenido: string) {
            archivos.set(ruta, contenido);
          },
          async remove(ruta: string) {
            archivos.delete(ruta);
          },
        },
      },
    },
  };
}

describe('reintento del arranque del motor', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('un arranque fallido se reprograma solo y detener() lo cancela', async () => {
    vi.useFakeTimers();

    const { app } = appConEstado();
    const motor = new MotorDeSync(app as never, () => undefined, '0.2.0');

    // El fallo del arranque real (acá: cualquier rechazo — red caída, server reiniciando).
    vi.spyOn(motor as unknown as { compatibilidad: () => Promise<unknown> }, 'compatibilidad')
      .mockRejectedValue(new Error('sin red'));
    // El espía cuenta llamadas y DELEGA en el iniciar real (sin mock): el catch real corre
    // y es el que programa el reintento.
    const iniciar = vi.spyOn(MotorDeSync.prototype, 'iniciar');

    await motor.iniciar().catch(() => {});
    expect(iniciar).toHaveBeenCalledTimes(1);

    // El reloj avanza: el reintento dispara el arranque de nuevo.
    await vi.advanceTimersByTimeAsync(30_000);
    expect(iniciar).toHaveBeenCalledTimes(2);

    // Detenido: el reintento pendiente se cancela y nada revive solo.
    await motor.detener();
    await vi.advanceTimersByTimeAsync(180_000);
    expect(iniciar).toHaveBeenCalledTimes(2);
  });
});
