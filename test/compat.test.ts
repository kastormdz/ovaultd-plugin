import { describe, expect, it } from 'vitest';
import {
  cabeceraCliente,
  comparar,
  evaluarCompatibilidad,
  MetaDelServer,
  tren,
} from '../src/compat';

const meta = (parcial: Partial<MetaDelServer> = {}): MetaDelServer => ({
  server_version: '0.2.0',
  api: 'v1',
  wire_protocol: 'v2',
  min_plugin_version: '0.2.0',
  features: ['meta', 'admin-web'],
  ...parcial,
});

describe('comparar', () => {
  it('compara por número, no por texto', () => {
    expect(comparar('0.10.0', '0.9.0')).toBe(1);
    expect(comparar('0.9.0', '0.10.0')).toBe(-1);
  });

  it('ignora los ceros de la derecha', () => {
    expect(comparar('0.2', '0.2.0')).toBe(0);
  });
});

describe('tren', () => {
  it('devuelve MAJOR.MINOR', () => {
    expect(tren('0.2.7')).toBe('0.2');
    expect(tren('1.4.0')).toBe('1.4');
  });
});

describe('evaluarCompatibilidad', () => {
  it('deja pasar la pareja del release train', () => {
    const v = evaluarCompatibilidad('0.2.3', meta({ server_version: '0.2.9' }));
    expect(v.ok).toBe(true);
    expect(v.bloqueo).toBeNull();
    expect(v.aviso).toBeNull();
    expect(v.features).toContain('meta');
  });

  it('bloquea un plugin viejo, con mensaje que apunta al plugin', () => {
    const v = evaluarCompatibilidad('0.1.9', meta());
    expect(v.ok).toBe(false);
    expect(v.bloqueo).toContain('Actualizá el plugin');
    expect(v.bloqueo).toContain('0.2.0');
  });

  it('avisa (sin bloquear) si el plugin va un tren adelante', () => {
    const v = evaluarCompatibilidad('0.3.0', meta({ server_version: '0.2.5' }));
    expect(v.ok).toBe(true);
    expect(v.bloqueo).toBeNull();
    expect(v.aviso).toContain('todavía no tenga');
  });

  it('bloquea si el wire no coincide: no hay nada que negociar', () => {
    const v = evaluarCompatibilidad('0.2.0', meta({ wire_protocol: 'v3' }));
    expect(v.ok).toBe(false);
    expect(v.bloqueo).toContain('wire v3');
  });

  it('tolera un meta sin features sin romper', () => {
    const v = evaluarCompatibilidad('0.2.0', meta({ features: undefined as unknown as string[] }));
    expect(v.ok).toBe(true);
    expect(v.features).toEqual([]);
  });
});

describe('cabeceraCliente', () => {
  it('identifica plugin y versión', () => {
    expect(cabeceraCliente('0.2.0')).toEqual({ 'x-ovaultd-client': 'oVaultd-plugin/0.2.0' });
  });
});
