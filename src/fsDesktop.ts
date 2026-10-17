/**
 * Acceso al FS del sistema operativo, SOLO en la app de escritorio (fase 3d).
 *
 * `window.require` es DINÁMICO a propósito: esbuild no lo ve, así que la puerta anti-Node
 * del build sigue intacta (el bundle no gana un solo import de `node:*`) y en móvil esto
 * devuelve `null` sin romper nada — los comandos de export/import avisan y listo.
 */

import { Platform } from 'obsidian';

interface FsDeNode {
  existsSync(ruta: string): boolean;
  mkdirSync(ruta: string, opciones: { recursive: boolean }): void;
  readFileSync(ruta: string): Uint8Array;
  readdirSync(
    ruta: string,
    opciones: { withFileTypes: true },
  ): Array<{ name: string; isDirectory(): boolean; isFile(): boolean }>;
  writeFileSync(ruta: string, contenido: Uint8Array): void;
}

interface PathDeNode {
  join(...partes: string[]): string;
  resolve(...partes: string[]): string;
  dirname(ruta: string): string;
}

interface OsDeNode {
  homedir(): string;
}

export interface FsDesktop {
  fs: FsDeNode;
  path: PathDeNode;
  os: OsDeNode;
}

const requerir: ((modulo: string) => unknown) | undefined = (
  window as unknown as { require?: (modulo: string) => unknown }
).require;

/** El FS del SO, o `null` si no estamos en escritorio (o el require dinámico no está). */
export function fsDesktop(): FsDesktop | null {
  if (!Platform.isDesktopApp || requerir === undefined) {
    return null;
  }

  try {
    return {
      fs: requerir('node:fs') as FsDeNode,
      path: requerir('node:path') as PathDeNode,
      os: requerir('node:os') as OsDeNode,
    };
  } catch {
    return null;
  }
}
