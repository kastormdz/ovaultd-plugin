/**
 * Contrato del `AdaptadorDeArchivos` contra un `DataAdapter` FALSO, en memoria.
 * No hace falta Obsidian para esto: la clase recibe el adapter inyectado a propósito.
 * Lo que se prueba es el contrato del PUERTO (raíz `'.'`, nombres vs paths absolutos,
 * temporal → rename) y el journal de escrituras propias (hash esperado).
 */

import { describe, expect, it } from 'vitest';
import type { DataAdapter, ListedFiles, Stat } from 'obsidian';

import { AdaptadorDeArchivos } from '../src/ObsidianFileAdapter';

class FakeDataAdapter {
  readonly archivos = new Map<string, Uint8Array>();
  readonly carpetas = new Set<string>(['']);
  readonly llamadas: string[] = [];

  async exists(p: string): Promise<boolean> {
    this.llamadas.push(`exists:${p}`);
    return this.archivos.has(p) || this.carpetas.has(p);
  }

  async stat(p: string): Promise<Stat | null> {
    const archivo = this.archivos.get(p);
    if (archivo !== undefined) return { type: 'file', ctime: 0, mtime: 111, size: archivo.byteLength };
    if (this.carpetas.has(p)) return { type: 'folder', ctime: 0, mtime: 0, size: 0 };
    return null;
  }

  async list(p: string): Promise<ListedFiles> {
    this.llamadas.push(`list:${p}`);
    const prefijo = p === '' ? '' : `${p}/`;
    const esHijoDirecto = (clave: string): boolean =>
      clave.startsWith(prefijo) && !clave.slice(prefijo.length).includes('/');

    return {
      files: [...this.archivos.keys()].filter(esHijoDirecto),
      folders: [...this.carpetas].filter((c) => c !== '' && esHijoDirecto(c)),
    };
  }

  async readBinary(p: string): Promise<ArrayBuffer> {
    const archivo = this.archivos.get(p);
    if (archivo === undefined) throw new Error(`ENOENT: ${p}`);
    return archivo.slice().buffer;
  }

  async writeBinary(p: string, datos: ArrayBuffer): Promise<void> {
    this.archivos.set(p, new Uint8Array(datos.slice(0)));
  }

  async mkdir(p: string): Promise<void> {
    this.carpetas.add(p);
  }

  async remove(p: string): Promise<void> {
    if (!this.archivos.delete(p)) throw new Error(`ENOENT: ${p}`);
  }

  async rename(desde: string, hacia: string): Promise<void> {
    const archivo = this.archivos.get(desde);
    if (archivo === undefined) throw new Error(`ENOENT: ${desde}`);
    this.archivos.set(hacia, archivo);
    this.archivos.delete(desde);
  }
}

const comoAdapter = (fake: FakeDataAdapter): DataAdapter => fake as unknown as DataAdapter;
const bytes = (texto: string): Uint8Array => new TextEncoder().encode(texto);
const mismos = (a: Uint8Array, b: Uint8Array): boolean =>
  a.length === b.length && a.every((v, i) => v === b[i]);

describe('AdaptadorDeArchivos (contrato del puerto)', () => {
  it('list: la raíz es "." y devuelve NOMBRES, no paths absolutos', async () => {
    const fake = new FakeDataAdapter();
    fake.archivos.set('uno.md', bytes('hola'));
    fake.carpetas.add('Notas');

    const adaptador = new AdaptadorDeArchivos(comoAdapter(fake));
    const entradas = await adaptador.list('.');

    expect(fake.llamadas).toContain('list:');
    expect(entradas).toEqual([
      { name: 'uno.md', isFile: true, isDirectory: false },
      { name: 'Notas', isFile: false, isDirectory: true },
    ]);
  });

  it('stat: mapea file/folder y null', async () => {
    const fake = new FakeDataAdapter();
    fake.archivos.set('a.md', bytes('12345'));
    fake.carpetas.add('dir');

    const adaptador = new AdaptadorDeArchivos(comoAdapter(fake));
    expect(await adaptador.stat('a.md')).toEqual({
      size: 5,
      mtimeMs: 111,
      isFile: true,
      isDirectory: false,
    });
    expect(await adaptador.stat('dir')).toMatchObject({ isFile: false, isDirectory: true });
    expect(await adaptador.stat('no-existe.md')).toBeNull();
  });

  it('writeTemp + rename: publica y deja el hash esperado (esCambioPropio true una vez)', async () => {
    const fake = new FakeDataAdapter();
    fake.carpetas.add('Notas');

    const adaptador = new AdaptadorDeArchivos(comoAdapter(fake));
    const contenido = bytes('contenido publicado');
    const { tempName } = await adaptador.writeTemp('Notas', contenido);

    expect(tempName.startsWith('Notas/.ovaultd-tmp-')).toBe(true);
    expect(AdaptadorDeArchivos.esTemporal(tempName)).toBe(true);

    await adaptador.rename(tempName, 'Notas/uno.md');
    expect(mismos(fake.archivos.get('Notas/uno.md')!, contenido)).toBe(true);
    expect(fake.archivos.has(tempName)).toBe(false);

    expect(await adaptador.esCambioPropio('Notas/uno.md', 'modificado')).toBe(true);
    // Consumido: la segunda vez ya no hay expectativa.
    expect(await adaptador.esCambioPropio('Notas/uno.md', 'modificado')).toBe(false);
  });

  it('esCambioPropio: si el contenido real NO coincide, el cambio es ajeno', async () => {
    const fake = new FakeDataAdapter();
    fake.carpetas.add('N');

    const adaptador = new AdaptadorDeArchivos(comoAdapter(fake));
    const { tempName } = await adaptador.writeTemp('N', bytes('nuestro'));
    await adaptador.rename(tempName, 'N/x.md');

    // Alguien editó el archivo después de nuestro publish: hash distinto.
    fake.archivos.set('N/x.md', bytes('edición del usuario'));

    expect(await adaptador.esCambioPropio('N/x.md', 'modificado')).toBe(false);
  });

  it('esCambioPropio: los temporales propios se descartan siempre', async () => {
    const fake = new FakeDataAdapter();
    const adaptador = new AdaptadorDeArchivos(comoAdapter(fake));

    expect(await adaptador.esCambioPropio('N/.ovaultd-tmp-123', 'creado')).toBe(true);
    expect(await adaptador.esCambioPropio('N/final.md', 'renombrado', 'N/.ovaultd-tmp-123')).toBe(true);
  });

  it('unlink: marca el borrado esperado una sola vez', async () => {
    const fake = new FakeDataAdapter();
    fake.archivos.set('b.md', bytes('x'));

    const adaptador = new AdaptadorDeArchivos(comoAdapter(fake));
    await adaptador.unlink('b.md');

    expect(await adaptador.esCambioPropio('b.md', 'borrado')).toBe(true);
    expect(await adaptador.esCambioPropio('b.md', 'borrado')).toBe(false);
  });

  it('mkdirp: crea nivel por nivel (mkdir del adapter no promete padres)', async () => {
    const fake = new FakeDataAdapter();
    const adaptador = new AdaptadorDeArchivos(comoAdapter(fake));

    await adaptador.mkdirp('a/b/c');

    expect(fake.carpetas.has('a')).toBe(true);
    expect(fake.carpetas.has('a/b')).toBe(true);
    expect(fake.carpetas.has('a/b/c')).toBe(true);
  });

  it('read: devuelve los bytes exactos', async () => {
    const fake = new FakeDataAdapter();
    fake.archivos.set('r.md', bytes('lectura'));

    const adaptador = new AdaptadorDeArchivos(comoAdapter(fake));
    expect(mismos(await adaptador.read('r.md'), bytes('lectura'))).toBe(true);
  });
});
