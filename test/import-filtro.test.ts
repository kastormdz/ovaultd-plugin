/**
 * Política del import (fase 3d) — sin Obsidian a propósito: se testea sola.
 */

import { describe, expect, it } from 'vitest';

import { copiaExacta, debeImportar } from '../src/rutasDeImport';

describe('debeImportar', () => {
  it('acepta notas normales (con subcarpetas, espacios y acentos)', () => {
    expect(debeImportar('Nota.md')).toBe(true);
    expect(debeImportar('Notas/sub/otra.md')).toBe(true);
    expect(debeImportar('con espacios ñ y tildes.md')).toBe(true);
  });

  it('deja afuera dotfiles y la config del vault', () => {
    expect(debeImportar('.oculto.md')).toBe(false);
    expect(debeImportar('Notas/.oculto.md')).toBe(false);
    expect(debeImportar('.obsidian/app.json')).toBe(false);
    expect(debeImportar('.trash/vieja.md')).toBe(false);
  });

  it('aplica la política del core (basura de dev)', () => {
    expect(debeImportar('node_modules/paquete/lib.md')).toBe(false);
    expect(debeImportar('Notas/node_modules/x.md')).toBe(false);
    expect(debeImportar('proyecto/.git/config')).toBe(false);
    expect(debeImportar('workspace-mobile.json')).toBe(false);
  });

  it('rechaza rutas vacías o absolutas', () => {
    expect(debeImportar('')).toBe(false);
    expect(debeImportar('/etc/passwd')).toBe(false);
  });
});

describe('copiaExacta (bytes del import)', () => {
  it('no arrastra el pool de 8 KB de Node', () => {
    // Un Buffer chico vive en el pool: `slice()` es un view y `.buffer` mide 8192.
    const pool = Buffer.alloc(8192, 0x41);
    const vista = pool.subarray(8, 108); // 100 bytes reales del archivo
    const copia = copiaExacta(vista);

    expect(copia.byteLength).toBe(100);
    expect(new Uint8Array(copia)).toEqual(new Uint8Array(vista));
    // Control: el patrón viejo devolvía el pool entero.
    expect(vista.slice().buffer.byteLength).toBe(8192);
  });
});
