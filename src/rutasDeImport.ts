/**
 * ¿Esta ruta (relativa al origen, con `/`) entra al vault en un import?
 *
 * Sin dependencias de Obsidian a propósito: la política se testea sola. Fuera:
 *  - cualquier segmento oculto (`.algo`: dotfiles y directorios de config);
 *  - lo que ya veta el core (`estaExcluido`: `.trash`, `.git` anidado, `node_modules`,
 *    temporales de escritura, `workspace*.json`) — la MISMA política que el scan, para
 *    que un import no meta basura que después se sincronice a medias.
 */

import { estaExcluido } from '@ovaultd/core';

const RUTA_POSIX = /^[^/]/;

/**
 * Copia EXACTA de los bytes en un ArrayBuffer del tamaño justo.
 *
 * `Buffer#slice()` no copia: devuelve una vista y `.buffer` es el **pool de 8 KB** de
 * Node, así que `bytes.slice().buffer` escribe 8192 bytes (con memoria ajena) por cada
 * archivo menor a 4 KB. Un `Uint8Array` nuevo sí copia y su buffer mide lo que debe.
 */
export function copiaExacta(bytes: Uint8Array): ArrayBuffer {
  const copia = new Uint8Array(bytes.byteLength);
  copia.set(bytes);
  return copia.buffer;
}

export function debeImportar(rutaRelativa: string): boolean {
  if (!RUTA_POSIX.test(rutaRelativa)) return false; // vacía o absoluta: no

  const segmentos = rutaRelativa.split('/');
  if (segmentos.some((segmento) => segmento.startsWith('.'))) return false;

  return !estaExcluido(rutaRelativa);
}
