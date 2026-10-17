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

export function debeImportar(rutaRelativa: string): boolean {
  if (!RUTA_POSIX.test(rutaRelativa)) return false; // vacía o absoluta: no

  const segmentos = rutaRelativa.split('/');
  if (segmentos.some((segmento) => segmento.startsWith('.'))) return false;

  return !estaExcluido(rutaRelativa);
}
