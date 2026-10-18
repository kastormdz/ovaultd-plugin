/**
 * merge.ts — merge de texto a 3 vías (base, ours, theirs), char-level (plan fase 3, paso 4).
 *
 * La composición es la del protocolo, y no es "usar diff-match-patch" a secas:
 *
 *  1. `d_ours = diff(base, ours)` y `d_theirs = diff(base, theirs)`, con los diffs CRUDOS.
 *  2. Los dos se PROYECTAN sobre la base: si sus rangos se solapan, es **conflicto**.
 *  3. Sin solapamiento, la fusión se ARMA recorriendo la base: determinística, sin fuzzy.
 *
 * Por qué no se usan `patch_make`/`patch_apply` para decidir ni para fusionar: los parches
 * llevan limpieza semántica, que los agranda para que "se lean mejor". Con eso, dos ediciones
 * disjuntas de un texto corto parecen solapadas y un parche puede terminar abarcando el texto
 * entero. Es exactamente el fuzzy contra el que advierte el plan: acá no decide nada.
 *
 * Reglas que salen de ahí:
 *  - El fuzzy matching jamás decide por su cuenta: un lugar ambiguo es conflicto.
 *  - Dos inserciones concurrentes en el mismo punto son conflicto (no se inventa un orden).
 *  - Dos ediciones CONTIGUAS (una termina donde empieza la otra) NO se pisan: se fusionan.
 *  - Quien llama decide QUÉ hacer con un conflicto (`protocol.md`: markers visibles para una
 *    revisión, o `nombre (conflicted copy <fecha>).md`). Acá sólo se decide si se puede fusionar.
 *  - Binarios, `.canvas` y `.base` NO se fusionan nunca: eso lo decide el llamador por tipo.
 */
export type ResultadoMerge = {
    tipo: 'merge';
    texto: string;
} | {
    tipo: 'conflicto';
};
/**
 * Fusiona `ours` y `theirs` sobre `base`. `conflicto` significa "esto lo decide el usuario":
 * ninguna parte del merge se aplica a medias.
 */
export declare function mergeDeTexto(base: string, ours: string, theirs: string): ResultadoMerge;
/** ¿Este path admite merge de texto? Binarios, canvas y bases: nunca. */
export declare function esMergeablePorTipo(path: string): boolean;
//# sourceMappingURL=merge.d.ts.map