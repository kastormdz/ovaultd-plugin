/**
 * Journal de aplicación (IndexedDB↔filesystem) — el lado del NÚCLEO.
 *
 * La secuencia completa del plan (paso 3) es:
 *   intención persistida → descarga a temporal → verificar firmas/hash/AEAD →
 *   publicar el archivo → **commit atómico** (intención cerrada + índice/base/checkpoint).
 *
 * Este módulo cubre la parte del núcleo: la intención vive ANTES de publicar, y el avance
 * de `since` solo ocurre en el commit atómico del `StateStore.completeApply()`. La parte de
 * filesystem (temporal, verificación, publicación, detección de tercera versión) vive en el
 * `NodeFileAdapter` y se orquesta desde el CLI.
 *
 * Regla dura: `since` avanza SOLO acá. Recibir un frame no equivale a aplicarlo.
 */
import type { IntentEntry } from './StateStore.js';
export interface ApplyCandidate {
    /** `path_id` en hex. */
    pathId: string;
    /** Revisión que se está aplicando. */
    rev: number;
    /** `blob_id` en hex del contenido a publicar. */
    blobId: string;
    /** Ruta relativa del destino (para la recuperación). */
    path?: string;
    kind?: 'file' | 'folder';
    deleted?: boolean;
    contentHash?: string | null;
    /** Nombre del archivo temporal en el vault (relativo), si ya se eligió. */
    tempName?: string;
}
/** `intentId` determinista por candidato: repetir el begin de la misma revisión no duplica. */
export declare function intentIdFor(candidate: ApplyCandidate): string;
/** Valida y materializa una intención de aplicación. */
export declare function createIntent(candidate: ApplyCandidate): IntentEntry;
//# sourceMappingURL=apply.d.ts.map