/**
 * Validación de rutas de vault (plan de fase 3, paso 2): una ruta DESCIFRADA que llegó
 * por el wire se valida ANTES de tocar el filesystem. Vive en el core porque el peligro
 * es el mismo en todas partes: Linux acepta casi cualquier nombre, pero un vault viaja
 * entre Windows/macOS/móvil — un nombre que allá no se puede escribir rompe el sync en
 * silencio. Nada de skips silenciosos: el llamador bloquea con el motivo a la vista.
 *
 * Criterio (espejo de lo que Obsidian acepta al crear notas + el mínimo portable):
 *  - nada de absolutas (`/…`, `C:\…`) ni travesía (`.`, `..`);
 *  - sin segmentos vacíos (`a//b`, barra final);
 *  - caracteres vetados en cualquier plataforma: `< > : " | ? * \` y controles;
 *  - sin punto ni espacio final (Windows los recorta);
 *  - nombres reservados de Windows (NUL, CON, COM1…, con o sin extensión);
 *  - segmento ≤ 255 bytes UTF-8 y ruta total ≤ 1000 caracteres.
 */
export type ValidacionDeRuta = {
    ok: true;
} | {
    ok: false;
    motivo: string;
};
/** Valida una ruta relativa de vault. `''` es válido: es el tombstone sin path. */
export declare function validarRutaDeVault(path: string): ValidacionDeRuta;
/** Último segmento de una ruta de vault (la ruta NO lleva barra final: ya se validó). */
export declare function nombreBase(path: string): string;
/**
 * ¿Algún nombre del directorio choca con `objetivo` solo por mayúsculas/normalización?
 * En filesystems case-insensitive (macOS, Windows) dos archivos así no pueden convivir;
 * detectarlo ANTES de escribir evita ese limbo. Devuelve el nombre que choca, o null.
 */
export declare function colisionDeCase(nombres: string[], objetivo: string): string | null;
//# sourceMappingURL=vault-path.d.ts.map