/**
 * Outbox **save-first**: la operación local se persiste ANTES de tocar el archivo visible.
 *
 * Invariantes (plan de fase 2, paso 2):
 *  - El `operation_id` es **determinista por payload**: reintento de un payload idéntico ⇒
 *    mismo ID (idempotente); rebase con contenido o precondición nuevos ⇒ payload nuevo ⇒
 *    operación NUEVA. Nunca se "regenera" el ID de una operación viva.
 *  - El snapshot del contenido es **recuperable** (Blob + hash verificado): el archivo del
 *    vault puede cambiar o desaparecer después — la outbox no depende de él.
 *  - Guardar solo el nombre no alcanza; guardar el contenido sin verificar su hash tampoco:
 *    si el hash declarado no coincide, se rechaza el encolado.
 */
import type { OutboxEntry } from './StateStore.js';
export interface EnqueueRequest {
    kind: 'add' | 'mod' | 'del' | 'move';
    /** Path (texto en claro, para diagnóstico y rebase). */
    path: string;
    /** `path_id` en hex (identidad de la entrada). */
    pathId: string;
    /** Solo en `move`: `path_id` de origen. */
    prevPathId?: string | null;
    /** Revisión contra la que se hará compare-and-swap. */
    expectedRev: number;
    folder?: boolean;
    /** Snapshot recuperable del contenido, en base64 (obligatorio en add/mod de archivos). */
    contentB64?: string | null;
    /** sha256 hex del contenido (obligatorio si hay `contentB64`). */
    contentHash?: string | null;
    /** Milisegundos de encolado (default: ahora). */
    queuedAt?: number;
    /** mtime del archivo al encolar (cache del escaneo incremental). */
    mtimeMs?: number;
}
/** `operation_id` determinista por payload (16 B → UUID textual). */
export declare function operationIdFor(req: EnqueueRequest): string;
/** Entradas que siguen esperando salir (ni confirmadas ni en cuarentena). */
export declare const estaPendiente: (entry: OutboxEntry) => boolean;
/**
 * Entradas que quedaron obsoletas para un path: el pull acaba de dejar la versión del
 * server como base de ese path, así que publicar el snapshot local viejo la pisaría.
 */
export declare function obsoletasDePath(entries: OutboxEntry[], pathId: string): OutboxEntry[];
/** Valida y materializa una entrada de outbox. No toca el store (eso es del commit). */
export declare function prepareOutboxEntry(req: EnqueueRequest): OutboxEntry;
//# sourceMappingURL=outbox.d.ts.map