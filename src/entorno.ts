/**
 * La ventana del renderer de Obsidian.
 *
 * Se usa `ventana` en vez de `globalThis` para que los timers y listeners queden en la
 * ventana correcta: Obsidian puede tener ventanas emergentes (popouts) con su propio
 * `window`, y `globalThis` no distingue.
 *
 * En los tests (node) no hay `window`: cae a `globalThis`, así el motor sigue siendo
 * testeable sin Obsidian.
 */
export const ventana: Window = (
  typeof window !== 'undefined' ? window : globalThis
) as unknown as Window;
