import { afterEach, describe, expect, it, vi } from 'vitest';

import { identidadDelDispositivo } from '../src/entorno';

/**
 * El nombre con el que este dispositivo se registra en el server: es lo que el panel
 * muestra en la lista de devices, así que dos máquinas nunca deberían verse idénticas
 * (con el literal «obsidian» todas se confundían).
 */
describe('identidadDelDispositivo', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sin puente de node cae a un nombre fijo, jamás al literal "obsidian"', () => {
    // En node no hay `require` en globalThis, pero `navigator.userAgent` existe
    // (Node.js/22) y no es de Android ni iOS: queda el fallback fijo.
    const identidad = identidadDelDispositivo();
    expect(identidad.name).not.toBe('obsidian');
    expect(identidad.platform).not.toBe('obsidian');
  });

  it('en el WebView de Android usa el MODELO del equipo (dos teléfonos no se confunden)', () => {
    vi.spyOn(globalThis.navigator, 'userAgent', 'get').mockReturnValue(
      'Mozilla/5.0 (Linux; Android 14; SM-S918B Build/UP1A.231005.007; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/120.0.0.0 Mobile Safari/537.36',
    );

    expect(identidadDelDispositivo()).toEqual({ name: 'SM-S918B', platform: 'android' });
  });

  it('en iOS no hay modelo en el UA: queda la familia', () => {
    vi.spyOn(globalThis.navigator, 'userAgent', 'get').mockReturnValue(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
    );

    expect(identidadDelDispositivo()).toEqual({ name: 'iPhone', platform: 'ios' });
  });
});
