import type { PlanDePrune } from './prune.js';
/**
 * `prune-remote` reconcilia el server contra el disco. Dos formas de destruir un vault
 * entero por accidente, y una guarda para las dos:
 *
 *  1. El disco está vacío (vault mal montado, carpeta equivocada) y el server tiene todo.
 *  2. El disco está a medias: más de la MITAD de los paths del server quedarían huérfanos.
 *
 * En los dos casos se aborta salvo `--permitir-vacio` (F-03 de la auditoría 2026-10-20).
 * Devuelve el mensaje de error, o `null` si el plan puede seguir.
 */
export declare function guardaDePrune(plan: PlanDePrune, permitirVacio: boolean): string | null;
//# sourceMappingURL=prune-guard.d.ts.map