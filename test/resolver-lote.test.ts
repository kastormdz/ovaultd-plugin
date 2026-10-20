/**
 * Resolución de conflictos EN LOTE: el motor resuelve todos los `blocked` con la
 * misma elección. Un fallo en uno no frena al resto (cada conflicto es independiente)
 * y el detalle de los fallidos vuelve a la UI.
 */

import { describe, expect, it, vi } from 'vitest';

import type { IntentEntry } from '@ovaultd/core';

import { MotorDeSync } from '../src/sync-engine';

const intent = (id: string, path: string): IntentEntry =>
  ({
    intentId: id,
    pathId: id.padEnd(32, '0'),
    rev: 1,
    blobId: 'blob',
    state: 'blocked',
    path,
    reason: 'tercera versión: editado en ambos lados',
  }) as IntentEntry;

describe('resolverTodos (lote)', () => {
  it('resuelve todos los conflictos con la misma elección', async () => {
    const motor = new MotorDeSync({} as never, () => undefined, '0.2.0');
    vi.spyOn(motor, 'conflictosPendientes').mockResolvedValue([
      intent('a', 'A.md'),
      intent('b', 'B.md'),
      intent('c', 'C.md'),
    ]);
    const resueltos: string[] = [];
    vi.spyOn(motor, 'resolver').mockImplementation(async (id, eleccion) => {
      resueltos.push(`${id}:${eleccion}`);
    });

    const resultado = await motor.resolverTodos('remoto');

    expect(resultado).toEqual({ resueltos: 3, fallidos: [] });
    expect(resueltos).toEqual(['a:remoto', 'b:remoto', 'c:remoto']);
  });

  it('un fallo no frena al resto y se informa', async () => {
    const motor = new MotorDeSync({} as never, () => undefined, '0.2.0');
    vi.spyOn(motor, 'conflictosPendientes').mockResolvedValue([
      intent('a', 'A.md'),
      intent('b', 'B.md'),
      intent('c', 'C.md'),
    ]);
    vi.spyOn(motor, 'resolver').mockImplementation(async (id) => {
      if (id === 'b') throw new Error('boom');
    });

    const resultado = await motor.resolverTodos('local');

    expect(resultado.resueltos).toBe(2);
    expect(resultado.fallidos).toEqual([{ path: 'B.md', error: 'boom' }]);
  });

  it('sin conflictos no llama a resolver', async () => {
    const motor = new MotorDeSync({} as never, () => undefined, '0.2.0');
    vi.spyOn(motor, 'conflictosPendientes').mockResolvedValue([]);
    const resolver = vi.spyOn(motor, 'resolver');

    const resultado = await motor.resolverTodos('local');

    expect(resultado).toEqual({ resueltos: 0, fallidos: [] });
    expect(resolver).not.toHaveBeenCalled();
  });
});
