/**
 * La ventana del renderer de Obsidian.
 *
 * Se usa `ventana` en vez de `globalThis` para que los timers y listeners queden en la
 * ventana correcta: Obsidian puede tener ventanas emergentes (popouts) con su propio
 * `window`, y `globalThis` no distingue.
 *
 * El fallback a `globalThis` es lo único que queda fuera de Obsidian: los tests corren en
 * node, donde no hay `window`, y este módulo tiene que poder evaluarse ahí. Es un warning
 * deliberado del linter del directorio, más barato que meter un mock de la API entera.
 */
export const ventana: Window = (
  typeof window !== 'undefined' ? window : globalThis
) as unknown as Window;

/**
 * Cómo se identifica ESTE dispositivo ante el server (signin).
 *
 * El panel del server lista los devices por nombre: con un literal («obsidian») todos los
 * equipos se ven iguales y no se sabe cuál revocar. En Electron el hostname del SO es la
 * etiqueta útil; en móvil no hay `require`, así que queda un nombre fijo distinguible.
 * `require` es DINÁMICO (igual que el export/import): el bundle móvil no debe ver imports
 * estáticos de node.
 */
export function identidadDelDispositivo(): { name: string; platform: string } {
  try {
    const requerir = (ventana as unknown as { require?: (modulo: string) => unknown }).require;
    if (typeof requerir === 'function') {
      const os = requerir('node:os') as { hostname?: () => string; platform?: () => string };
      const hostname = os.hostname?.();
      const plataforma = os.platform?.();
      if (typeof hostname === 'string' && hostname.trim() !== '') {
        return { name: hostname.trim(), platform: plataforma ?? 'desconocida' };
      }
    }
  } catch {
    // sin puente de node (móvil): cae al nombre fijo de abajo
  }
  return { name: 'Obsidian móvil', platform: 'movil' };
}
