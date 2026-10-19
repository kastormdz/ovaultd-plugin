/**
 * Push — la mitad de subida del ciclo offline (fase 2, paso 4).
 *
 * Flujo (save-first, paso 2 del plan):
 *   1. Escaneo + hash-diff contra la base.
 *   2. Cada cambio se **encola** (snapshot Blob verificado) ANTES de publicar nada.
 *   3. Drenado, una operación por batch: cifrar (ADR-0014) → subir blob (HTTP) →
 *      firmar `msg_rec` → commit por WS. El `expected_rev` es el head VIVO: arranca en
 *      el checkpoint y avanza con cada ack de NUESTRAS operaciones (si otro device
 *      commitea en el medio, el CAS da `conflict` — que es exactamente lo que queremos).
 *   4. Ack: base + índice avanzan y la entrada pasa a confirmed (se borra).
 *      Conflict: se surfacea y la operación queda `pending` (resolución fina = fase 5).
 *
 * El `operation_id` es el de la entrada de outbox: determinista y persistido, así el
 * reintento del MISMO intento (crash entre commit y ack incluido) reusa la operación y
 * el server la responde idempotente.
 *
 * Un batch por operación en este corte: el protocolo permite hasta 5 ops por revisión,
 * pero la corrección primero — agrupar es una optimización con CAS más delicado.
 */
import type { ApplyDeps } from './apply-runner.js';
import { type SyncConnection } from './SyncConnection.js';
export interface PushDeps extends ApplyDeps {
    conn: SyncConnection;
    /** `vault_id` de 16 B (el del material, no el numérico del server). */
    vaultUuid: Uint8Array;
    epoch: number;
}
export interface PushReport {
    diff: {
        nuevos: number;
        modificados: number;
        borrados: number;
        sinCambios: number;
        yaEncolados: number;
    };
    encoladas: number;
    empujadas: number;
    headRev: number;
    /**
     * Deletes que la guarda del cliente vacío NO encoló: sin ningún archivo local, los
     * "borrados" del diff son un artefacto (vault recién creado, disco sin montar, scan a
     * medias), no una intención del usuario.
     */
    deletesBloqueados: number;
    conflicto?: {
        operationId: string;
        path?: string;
        mensaje: string;
    };
}
/** Una pasada de subida: escanear → encolar → drenar. No reconecta (eso es del llamador). */
export declare function pushOnce(deps: PushDeps): Promise<PushReport>;
//# sourceMappingURL=push.d.ts.map