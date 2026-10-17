/**
 * Coalescer del `PuenteDeEventos` con un vault FALSO y timers falsos.
 * Lo que se prueba: la fusión de eventos por path (create+modify → create, etc.),
 * que un evento durante el vaciado NO se pierde, y que los cambios propios se
 * descartan por hash (callback) sin ignorar nada "por intervalo".
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { TAbstractFile, Vault } from 'obsidian';

import { PuenteDeEventos, type CambioDeVault } from '../src/ObsidianFileAdapter';

class FakeVault {
  private oyentes: Array<{ nombre: string; cb: (...args: unknown[]) => unknown; id: number }> = [];
  private siguienteId = 1;

  on(nombre: string, cb: (...args: unknown[]) => unknown): unknown {
    const oyente = { nombre, cb, id: this.siguienteId++ };
    this.oyentes.push(oyente);
    return oyente;
  }

  offref(ref: unknown): void {
    this.oyentes = this.oyentes.filter((o) => o !== ref);
  }

  disparar(nombre: string, ...args: unknown[]): void {
    for (const oyente of [...this.oyentes]) {
      if (oyente.nombre === nombre) oyente.cb(...args);
    }
  }

  cantidadOyentes(): number {
    return this.oyentes.length;
  }
}

const archivo = (path: string, carpeta = false): TAbstractFile =>
  (carpeta ? { path, children: [] } : { path }) as unknown as TAbstractFile;

const comoVault = (fake: FakeVault): Vault => fake as unknown as Vault;

describe('PuenteDeEventos', () => {
  let vault: FakeVault;
  let cambios: CambioDeVault[];
  let descartados: CambioDeVault[];

  beforeEach(() => {
    vi.useFakeTimers();
    vault = new FakeVault();
    cambios = [];
    descartados = [];
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const crearPuente = (
    esPropio: (cambio: CambioDeVault) => Promise<boolean> = async () => false,
    estabilidadMs = 250,
  ): PuenteDeEventos => {
    const puente = new PuenteDeEventos(comoVault(vault), {
      estabilidadMs,
      onCambio: (cambio) => {
        cambios.push(cambio);
      },
      esCambioPropio: esPropio,
      onDescartado: (cambio) => {
        descartados.push(cambio);
      },
    });
    puente.iniciar();
    return puente;
  };

  it('create + modify en la ventana → UN solo "creado"', async () => {
    crearPuente();
    vault.disparar('create', archivo('a.md'));
    vault.disparar('modify', archivo('a.md'));

    await vi.advanceTimersByTimeAsync(300);

    expect(cambios).toEqual([{ tipo: 'creado', path: 'a.md', carpeta: false }]);
  });

  it('create + delete en la ventana → neto nada (transitorio)', async () => {
    crearPuente();
    vault.disparar('create', archivo('efimero.md'));
    vault.disparar('delete', archivo('efimero.md'));

    await vi.advanceTimersByTimeAsync(300);

    expect(cambios).toEqual([]);
  });

  it('el rename gana y conserva oldPath', async () => {
    crearPuente();
    vault.disparar('modify', archivo('a.md'));
    vault.disparar('rename', archivo('b.md'), 'a.md');

    await vi.advanceTimersByTimeAsync(300);

    expect(cambios).toEqual([{ tipo: 'renombrado', path: 'b.md', oldPath: 'a.md', carpeta: false }]);
  });

  it('rename seguido de delete → borrado (del path nuevo)', async () => {
    crearPuente();
    vault.disparar('rename', archivo('b.md'), 'a.md');
    vault.disparar('delete', archivo('b.md'));

    await vi.advanceTimersByTimeAsync(300);

    expect(cambios).toEqual([{ tipo: 'borrado', path: 'b.md', carpeta: false }]);
  });

  it('rafagas: cada ráfaga extiende la ventana (debounce)', async () => {
    crearPuente(undefined, 100);
    vault.disparar('modify', archivo('a.md'));
    await vi.advanceTimersByTimeAsync(80);
    vault.disparar('modify', archivo('a.md'));
    await vi.advanceTimersByTimeAsync(80);

    expect(cambios).toEqual([]); // todavía dentro de la ventana extendida

    await vi.advanceTimersByTimeAsync(40);
    expect(cambios).toEqual([{ tipo: 'modificado', path: 'a.md', carpeta: false }]);
  });

  it('un evento DURANTE el vaciado no se pierde', async () => {
    let resolverPrimera: (v: boolean) => void = () => undefined;
    const esPropio = vi
      .fn<(cambio: CambioDeVault) => Promise<boolean>>()
      .mockImplementationOnce(
        () =>
          new Promise<boolean>((resolver) => {
            resolverPrimera = resolver;
          }),
      )
      .mockResolvedValue(false);

    crearPuente(esPropio, 100);
    vault.disparar('modify', archivo('a.md'));
    await vi.advanceTimersByTimeAsync(100); // vaciar arranca y queda esperando

    vault.disparar('modify', archivo('a.md')); // llega durante el vaciado

    resolverPrimera(false);
    await vi.advanceTimersByTimeAsync(1); // microtasks del primer vaciado
    expect(cambios).toHaveLength(1);

    await vi.advanceTimersByTimeAsync(100); // ventana del segundo
    expect(cambios).toHaveLength(2);
  });

  it('cambio propio: no se emite a onCambio, sí a onDescartado', async () => {
    crearPuente(async () => true);
    vault.disparar('modify', archivo('nuestro.md'));

    await vi.advanceTimersByTimeAsync(300);

    expect(cambios).toEqual([]);
    expect(descartados).toEqual([{ tipo: 'modificado', path: 'nuestro.md', carpeta: false }]);
  });

  it('las carpetas se distinguen', async () => {
    crearPuente();
    vault.disparar('create', archivo('Dir', true));

    await vi.advanceTimersByTimeAsync(300);

    expect(cambios).toEqual([{ tipo: 'creado', path: 'Dir', carpeta: true }]);
  });

  it('detener: suelta los oyentes y mata los pendientes', async () => {
    const puente = crearPuente();
    vault.disparar('modify', archivo('a.md'));
    puente.detener();

    await vi.advanceTimersByTimeAsync(500);

    expect(vault.cantidadOyentes()).toBe(0);
    expect(cambios).toEqual([]);
  });

  it('avisar: inicio/reanudado pasan sin coalescer ni check de propiedad', async () => {
    const puente = crearPuente(async () => true);
    puente.avisar('inicio');

    await vi.advanceTimersByTimeAsync(1);

    expect(cambios).toEqual([{ tipo: 'inicio' }]);
  });
});
