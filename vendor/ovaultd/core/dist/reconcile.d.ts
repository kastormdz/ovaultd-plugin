/**
 * Reconcile — el ciclo de convergencia (lado PULL de fase 2; el drenaje de la outbox
 * llega con el comando `sync` del CLI).
 *
 * Reglas:
 *  - `since` avanza SOLO por `completeApply` (aplicación recuperable) — acá no se toca.
 *  - Una revisión `blocked` CORTA el ciclo: el checkpoint no puede saltar una revisión
 *    sin aplicar, así que nada posterior se aplica hasta resolverla (fase 5).
 *  - `min_rev` mayor que `since` ⇒ **resync**: se informa SIN borrar nada — la outbox
 *    y el estado local se preservan (jamás "arreglar" el cursor borrando estado).
 */
import { type ApplyDeps } from './apply-runner.js';
import type { SyncConnection } from './SyncConnection.js';
export interface PullReport {
    status: 'pulled' | 'blocked' | 'resync-required';
    applied: number;
    headRev: number;
    blocked?: {
        rev: number;
        pathId: string;
        reason?: string;
    };
    resync?: {
        since: number;
        minRev: number;
    };
}
/** Una pasada de convergencia (pull). No reconecta: eso es de `retry`/llamador. */
export declare function pullOnce(conn: SyncConnection, deps: ApplyDeps): Promise<PullReport>;
//# sourceMappingURL=reconcile.d.ts.map