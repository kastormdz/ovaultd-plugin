/**
 * `appearance.json` es config COMPARTIDA solo a medias.
 *
 * - **Viaja**: el tema elegido (`cssTheme`) y los snippets habilitados (`enabledCssSnippets`)
 *   son decisiones del usuario y tienen sentido en todos los dispositivos.
 * - **NO viaja**: el modo claro/oscuro (`theme`), las fuentes y el tamaño — Obsidian los
 *   reescribe por dispositivo (el modo automático cambia al anochecer). Sincronizar el
 *   archivo entero generó 25 revisiones del mismo path entre 3 devices: colisión infinita.
 *
 * Dos piezas acá:
 *  1. `proyeccionDeApariencia` — lo que cuenta como "cambio" (hash proyectado). Un cambio
 *     de modo no genera revisión.
 *  2. `mergeDeApariencia` — merge POR CAMPO en el apply. No es el 3-vías de texto: con
 *     JSON por líneas cualquier reformateo es conflicto.
 */
/** ¿El path es un `appearance.json` (del configDir que sea)? */
export declare const esApariencia: (path: string) => boolean;
/**
 * Proyección canónica: SOLO los campos portables, con los snippets ordenados. Es lo que
 * se hashea para decidir si el archivo cambió.
 */
export declare function proyeccionDeApariencia(texto: string): string;
/**
 * Hash de un archivo para el diff/apply. Para `appearance.json` es el hash de la
 * PROYECCIÓN: así el modo que Obsidian reescribe solo no se ve como una edición.
 * Para todo lo demás, el hash de los bytes.
 */
export declare function hashDePath(path: string, bytes: Uint8Array): string;
/**
 * Merge por campo: `{...local, ...portablesDelRemoto}`. Un campo portable solo se toma
 * del remoto si el remoto lo CAMBIÓ respecto de la base — así un cambio local del tema no
 * se pisa con el remoto viejo. El resto del archivo (modo, fuentes, claves que no
 * conocemos) queda como estaba en el local.
 *
 * JSON inválido en cualquier lado: gana el local (nunca se rompe el archivo).
 */
export declare function mergeDeApariencia(base: string, local: string, remoto: string): string;
//# sourceMappingURL=apariencia.d.ts.map