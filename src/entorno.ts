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
