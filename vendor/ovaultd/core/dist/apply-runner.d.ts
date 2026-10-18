/**
 * Orquestador de aplicación: intención → temporal verificado → publicar → commit atómico.
 *
 * Invariantes (plan de fase 2, paso 3):
 *  - La intención se persiste ANTES de escribir el temporal, y el temporal se verifica
 *    (sha256 del plaintext) ANTES de publicar.
 *  - El commit es atómico (StateStore.completeApply): `since` avanza SOLO cuando la
 *    revisión quedó recuperablemente aplicada.
 *  - Una **tercera versión local** (archivo modificado después de la base) jamás se pisa:
 *    la intención queda `blocked`, el archivo local intacto, y la resolución es explícita.
 *  - `recoverApplies()` decide desde las INTENCIONES + el estado real del filesystem:
 *    no adivina — compara hashes.
 *
 * Fase 3, paso 2: la ruta descifrada se VALIDA (portable a Windows/macOS/móvil) y el
 * directorio destino se chequea por colisiones de case: el bloqueo es explícito, con
 * motivo, nunca un skip silencioso.
 */
import { type SubKeys } from '@ovaultd/crypto';
import type { FileSystemPort } from './file-port.js';
import type { IntentEntry, StateStore } from './StateStore.js';
import type { SyncConnection } from './SyncConnection.js';
export interface ApplyRevision {
    /** `path_id` en hex. */
    pathId: string;
    /** Ruta relativa en el vault (texto en claro). */
    path: string;
    kind: 'file' | 'folder';
    deleted: boolean;
    rev: number;
    /** `blob_id` en hex del contenido (null en tombstones/carpetas). */
    blobId: string | null;
    /** sha256 hex del PLAINTEXT esperado (del registro). */
    contentHash?: string | null;
}
export interface ApplyDeps {
    store: StateStore;
    port: FileSystemPort;
    /** Subclaves `sync2` del vault (incluye la de contenido). */
    keys: SubKeys;
}
export type ApplyStatus = 'applied' | 'blocked' | 'noop';
export interface ApplyOutcome {
    status: ApplyStatus;
    intentId: string;
    reason?: string;
}
export interface RecoveryReport {
    completed: number;
    cleaned: number;
    blocked: number;
}
/** Aplica una revisión remota. `stored` es el blob almacenado (nonce incluido) o null. */
export declare function applyRevision(deps: ApplyDeps, revision: ApplyRevision, stored: Uint8Array | null, 
/** `forzar`: la resolución explícita del usuario pisa un bloqueo de tercera versión
 *  (la elección "usar la del server"). Los chequeos estructurales no se saltean. */
opciones?: {
    forzar?: boolean;
}): Promise<ApplyOutcome>;
/**
 * Recuperación al reiniciar: compara cada intención con el estado REAL del filesystem.
 * - `pending`  → nada se publicó: se limpia.
 * - `verified` → hay temporal verificado y/o destino con el hash esperado: completa
 *   (publicar si falta, y commitear). Si el destino tiene cualquier otra cosa, `blocked`.
 */
export declare function recoverApplies(deps: ApplyDeps): Promise<RecoveryReport>;
export type EleccionDeResolucion = 'local' | 'remoto';
/**
 * Resuelve una intención BLOQUEADA con la elección EXPLÍCITA del usuario (resolución
 * mínima de conflictos). Dos caminos:
 *
 *  - `'remoto'`: baja el contenido del server y PISA el local (apply forzado). Quien
 *    elige esto pierde su edición local a propósito.
 *  - `'local'`: el archivo local queda INTACTO; la base avanza al remoto (con el hash
 *    del plaintext remoto) y el próximo push sube la edición local como revisión nueva.
 *
 * Ambas cierran la intención y avanzan el checkpoint hasta la revisión bloqueada: el
 * pull puede seguir. Los bloqueos ESTRUCTURALES (ruta inválida, colisión de case) no se
 * resuelven por acá — son datos que no pueden materializarse, no una tercera versión.
 */
export declare function resolverBloqueado(deps: ApplyDeps, intent: IntentEntry, eleccion: EleccionDeResolucion, conn: SyncConnection): Promise<ApplyOutcome>;
//# sourceMappingURL=apply-runner.d.ts.map