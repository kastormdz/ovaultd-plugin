/**
 * Reconcile — el ciclo de convergencia (lado PULL de fase 2; el drenaje de la outbox
 * llega con el comando `sync` del CLI).
 *
 * Reglas:
 *  - `since` avanza SOLO acá, al cerrar una revisión COMPLETA (aplicación recuperable).
 *    Una revisión del server trae N operaciones: escribir el cursor al aplicar la primera
 *    dejaba las demás inalcanzables para siempre (`rev > since`).
 *  - Un `blocked` NO corta el ciclo (C-a, 0.2.21): el intent queda `blocked` (visible y
 *    resoluble desde el Resolver) y el cursor avanza igual. Antes una sola carpeta en
 *    conflicto dejaba al device sin bajar NADA más, para siempre.
 *  - `min_rev` mayor que `since` ⇒ **resync**: se informa SIN borrar nada — la outbox
 *    y el estado local se preservan (jamás "arreglar" el cursor borrando estado).
 */
import { type ApplyDeps } from './apply-runner.js';
import type { SyncConnection } from './SyncConnection.js';
export interface PullReport {
    status: 'pulled' | 'blocked' | 'resync-required';
    applied: number;
    headRev: number;
    /** Primer bloqueo de la pasada (compat: el detalle completo está en `bloqueados`). */
    blocked?: {
        rev: number;
        pathId: string;
        reason?: string;
    };
    /** Todos los bloqueos de la pasada: ya no frenan al resto del vault. */
    bloqueados?: Array<{
        rev: number;
        pathId: string;
        reason?: string;
    }>;
    resync?: {
        since: number;
        minRev: number;
    };
}
/** Una pasada de convergencia (pull). No reconecta: eso es de `retry`/llamador. */
export declare function pullOnce(conn: SyncConnection, deps: ApplyDeps & {
    forzar?: boolean;
}): Promise<PullReport>;
//# sourceMappingURL=reconcile.d.ts.map