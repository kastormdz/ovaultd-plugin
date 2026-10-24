/**
 * `StateStore` — el estado durable del cliente, en IndexedDB.
 *
 * Es la ÚNICA fuente de verdad local (decisión del plan: nada de SQLite local, nada de
 * `fake-indexeddb` en producción). Stores versionados:
 *
 *  - `index`      → qué conoce el cliente de cada path (entrada actual + metadatos).
 *  - `base`       → la revisión BASE sincronizada por path (para 3-vías y compare-and-swap).
 *  - `outbox`     → operaciones locales pendientes, con su `operation_id` y snapshot.
 *  - `transfers`  → transferencias parciales (subida/bajada reanudable).
 *  - `intents`    → intenciones de aplicación (journal IndexedDB↔filesystem).
 *  - `checkpoint` → el cursor `since`/`min_rev` aplicado recuperablemente.
 *
 * Regla dura del núcleo: `since` avanza SOLO cuando la revisión quedó recuperablemente
 * aplicada. Este archivo no conoce el wire: es estado puro.
 */
export declare const SCHEMA_VERSION = 1;
export declare const DB_NAME_DEFAULT = "ovaultd";
/** Entrada del índice: lo que el cliente sabe de un path. */
export interface IndexEntry {
    /** `path_id` en hex (clave). */
    pathId: string;
    /** Path descifrado, si se conoce. */
    path?: string;
    kind: 'file' | 'folder';
    deleted: boolean;
    /** Última revisión conocida de la entrada. */
    rev: number;
    /** `blob_id` en hex de la revisión vigente (null en carpetas/tombstones). */
    blobId?: string | null;
    size?: number | null;
    mtime?: number | null;
    /** Hash del contenido LOCAL (hash-diff), si se computó. */
    contentHash?: string | null;
}
/** Base sincronizada: contra qué revisión se comparan los cambios. */
export interface BaseEntry {
    /** `path_id` en hex (clave). */
    pathId: string;
    rev: number;
    blobId?: string | null;
    contentHash?: string | null;
}
/** Operación pendiente de publicación. */
export interface OutboxEntry {
    /** `operation_id` (UUID textual): se genera UNA vez y sobrevive reintentos. */
    operationId: string;
    kind: 'add' | 'mod' | 'del' | 'move';
    pathId: string;
    path?: string;
    prevPathId?: string;
    /** Revisión contra la que se hará compare-and-swap. */
    expectedRev: number;
    queuedAt: number;
    /** Snapshot recuperable del contenido local (save-first). */
    snapshot?: Blob | null;
    snapshotHash?: string | null;
    /** Estado de publicación: pending → sent (ack) → confirmed; `rejected` = el server la
     *  rechazó por un problema de ESTA operación (archivo demasiado grande, sin snapshot,
     *  bad_request) y no se reintenta sola: queda visible para el usuario. */
    state: 'pending' | 'sent' | 'confirmed' | 'rejected';
    /** Motivo del rechazo (sólo en `rejected`). */
    lastError?: string | null;
    /** mtime del archivo al encolar: alimenta el cache del escaneo incremental. */
    mtimeMs?: number | null;
}
/** Transferencia parcial (reanudable). */
export interface TransferEntry {
    transferId: string;
    blobId: string;
    direction: 'up' | 'down';
    received: number;
    total: number;
    updatedAt: number;
    part?: Blob | null;
}
/** Estado remoto de una fusión aplicada (ver `IntentEntry.mergeBase`). */
export interface IntentMergeBase {
    rev: number;
    blobId: string | null;
    contentHash: string | null;
    oursHash: string;
}
/** Intención de aplicación (journal IndexedDB↔filesystem). */
export interface IntentEntry {
    intentId: string;
    pathId: string;
    rev: number;
    blobId: string;
    /** pending → verified → (commit) | blocked (tercera versión: espera resolución). */
    state: 'pending' | 'verified' | 'blocked';
    /** Ruta relativa del destino en el vault (texto en claro, para la recuperación). */
    path?: string;
    /** La operación era un borrado. */
    deleted?: boolean;
    /** Tipo de entrada. */
    kind?: 'file' | 'folder';
    /** sha256 hex del PLAINTEXT esperado: permite recuperar sin el server. */
    contentHash?: string | null;
    /**
     * Fusión 3-vías aplicada (el intent nació de un merge automático): guarda el estado
     * REMOTO con el que quedó sincronizado el path y el hash del local que se fusionó.
     * El commit escribe base/índice con el `contentHash` REMOTO (no el de la fusión): así
     * el scan ve que el archivo difiere del índice y el push sube la fusión como revisión
     * nueva. `oursHash` es el control del recovery: si el destino ya no es ni el local
     * que se fusionó, se bloquea en vez de pisar.
     */
    mergeBase?: IntentMergeBase | null;
    /** Nombre del archivo temporal en el vault (relativo). */
    tempName?: string;
    /** Por qué quedó bloqueada (si state === 'blocked'). */
    reason?: string;
    createdAt: number;
}
/** Checkpoint: el cursor aplicado recuperablemente. */
export interface CheckpointEntry {
    id: 'checkpoint';
    since: number;
    minRev: number | null;
    updatedAt: number;
}
type StoreName = 'index' | 'base' | 'outbox' | 'transfers' | 'intents' | 'checkpoint';
export declare const STORE_NAMES: readonly StoreName[];
export declare class StateStore {
    private readonly db;
    private constructor();
    static open(name?: string): Promise<StateStore>;
    /** Cierra la conexión (los datos quedan durables en el perfil). */
    close(): void;
    readCheckpoint(): Promise<CheckpointEntry | null>;
    writeCheckpoint(entry: Omit<CheckpointEntry, 'id' | 'updatedAt'> & {
        updatedAt?: number;
    }): Promise<CheckpointEntry>;
    getIndex(pathId: string): Promise<IndexEntry | null>;
    putIndex(entry: IndexEntry): Promise<void>;
    deleteIndex(pathId: string): Promise<void>;
    listIndex(): Promise<IndexEntry[]>;
    getBase(pathId: string): Promise<BaseEntry | null>;
    putBase(entry: BaseEntry): Promise<void>;
    deleteBase(pathId: string): Promise<void>;
    listBase(): Promise<BaseEntry[]>;
    putOutbox(entry: OutboxEntry): Promise<void>;
    /** Encola varias entradas en UNA transacción (el push inicial encola cientos de golpe). */
    putOutboxMany(entries: OutboxEntry[]): Promise<void>;
    getOutbox(operationId: string): Promise<OutboxEntry | null>;
    /** Outbox en orden FIFO de encolado (cola serial). */
    listOutbox(): Promise<OutboxEntry[]>;
    deleteOutbox(operationId: string): Promise<void>;
    /** Transición de estado de una operación (pending → sent → confirmed). */
    /**
     * Marca como `rejected` las entradas pendientes de un path: el pull aplicó la versión
     * del server y publicar el snapshot local viejo pisaría esa revisión (el caso que hacía
     * que un conflicto "resuelto" volviera atrás en el ciclo siguiente).
     */
    descartarOutboxDePath(pathId: string, motivo: string): Promise<number>;
    setOutboxState(operationId: string, state: OutboxEntry['state'], lastError?: string | null): Promise<OutboxEntry>;
    /**
     * Confirmación de un LOTE del push en UNA transacción de IndexedDB: base + índice +
     * outbox (borrado) + checkpoint. Antes eran 4 transacciones POR NOTA (~16,5 ms cada
     * una: el piso medido del T1); acá el lote entero paga el costo fijo UNA vez.
     * Es atómica: si el proceso muere, o se confirma el lote entero o nada (las entradas
     * siguen en `sent` y el reintento es idempotente).
     */
    confirmarLote(items: Array<{
        entry: OutboxEntry;
        base: BaseEntry;
        index: IndexEntry;
    }>, checkpoint: {
        since: number;
        minRev: number | null;
    }): Promise<void>;
    putTransfer(entry: TransferEntry): Promise<void>;
    getTransfer(transferId: string): Promise<TransferEntry | null>;
    listTransfers(): Promise<TransferEntry[]>;
    deleteTransfer(transferId: string): Promise<void>;
    putIntent(entry: IntentEntry): Promise<void>;
    getIntent(intentId: string): Promise<IntentEntry | null>;
    /** Intenciones en un estado (recuperación al reiniciar: se listan las `pending`). */
    listIntents(state?: IntentEntry['state']): Promise<IntentEntry[]>;
    deleteIntent(intentId: string): Promise<void>;
    /** Intención → `verified` (hash/AEAD verificados, lista para publicar). */
    markIntentVerified(intentId: string): Promise<IntentEntry>;
    /**
     * Commit ATÓMICO del journal: cierra la intención y avanza base/índice/checkpoint en
     * UNA transacción de IndexedDB. `since` avanza SOLO por acá — recibir un frame no
     * equivale a aplicarlo, y un commit a medias no existe.
     */
    completeApply(input: CompleteApplyInput): Promise<void>;
}
/** Entrada del commit atómico del journal. */
export interface CompleteApplyInput {
    intentId: string;
    base?: BaseEntry | null;
    index?: IndexEntry | null;
    checkpoint?: {
        since: number;
        minRev: number | null;
    } | null;
}
export {};
//# sourceMappingURL=StateStore.d.ts.map