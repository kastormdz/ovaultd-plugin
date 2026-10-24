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
import { openDB } from 'idb';
import { obsoletasDePath } from './outbox.js';
export const SCHEMA_VERSION = 1;
export const DB_NAME_DEFAULT = 'ovaultd';
export const STORE_NAMES = [
    'index',
    'base',
    'outbox',
    'transfers',
    'intents',
    'checkpoint',
];
/**
 * Migraciones versionadas: el índice ES la versión (MIGRATIONS[i] lleva la DB de
 * versión i a i+1). Las bases reales de usuarios se migran acá; nunca se recrean.
 */
const MIGRATIONS = [
    // v0 → v1: esquema inicial completo.
    (db) => {
        db.createObjectStore('index', { keyPath: 'pathId' });
        db.createObjectStore('base', { keyPath: 'pathId' });
        const outbox = db.createObjectStore('outbox', { keyPath: 'operationId' });
        outbox.createIndex('by_queued', 'queuedAt');
        const transfers = db.createObjectStore('transfers', { keyPath: 'transferId' });
        transfers.createIndex('by_updated', 'updatedAt');
        const intents = db.createObjectStore('intents', { keyPath: 'intentId' });
        intents.createIndex('by_state', 'state');
        db.createObjectStore('checkpoint', { keyPath: 'id' });
    },
];
export class StateStore {
    db;
    constructor(db) {
        this.db = db;
    }
    static async open(name = DB_NAME_DEFAULT) {
        const db = await openDB(name, SCHEMA_VERSION, {
            upgrade(database, oldVersion) {
                for (let version = oldVersion; version < SCHEMA_VERSION; version += 1) {
                    MIGRATIONS[version]?.(database);
                }
            },
            blocked() {
                // Otra pestaña/runtime con una versión vieja tiene la DB abierta: no la pisamos.
                console.warn('[ovaultd] IndexedDB bloqueada por una conexión anterior');
            },
        });
        return new StateStore(db);
    }
    /** Cierra la conexión (los datos quedan durables en el perfil). */
    close() {
        this.db.close();
    }
    // ------------------------------------------------------------------ checkpoint
    async readCheckpoint() {
        return (await this.db.get('checkpoint', 'checkpoint')) ?? null;
    }
    async writeCheckpoint(entry) {
        // El cursor NUNCA retrocede: un ack idempotente con una rev vieja (o resolver un intent
        // de una rev anterior) rebobinaba el pull y re-aplicaba revisiones ya aplicadas.
        const actual = await this.db.get('checkpoint', 'checkpoint');
        const value = {
            id: 'checkpoint',
            since: actual ? Math.max(actual.since, entry.since) : entry.since,
            minRev: entry.minRev ?? actual?.minRev ?? null,
            updatedAt: entry.updatedAt ?? Date.now(),
        };
        await this.db.put('checkpoint', value);
        return value;
    }
    // ------------------------------------------------------------------ index
    async getIndex(pathId) {
        return (await this.db.get('index', pathId)) ?? null;
    }
    async putIndex(entry) {
        await this.db.put('index', entry);
    }
    async deleteIndex(pathId) {
        await this.db.delete('index', pathId);
    }
    async listIndex() {
        return this.db.getAll('index');
    }
    // ------------------------------------------------------------------ base
    async getBase(pathId) {
        return (await this.db.get('base', pathId)) ?? null;
    }
    async putBase(entry) {
        await this.db.put('base', entry);
    }
    async deleteBase(pathId) {
        await this.db.delete('base', pathId);
    }
    async listBase() {
        return this.db.getAll('base');
    }
    // ------------------------------------------------------------------ outbox
    async putOutbox(entry) {
        await this.db.put('outbox', entry);
    }
    /** Encola varias entradas en UNA transacción (el push inicial encola cientos de golpe). */
    async putOutboxMany(entries) {
        if (entries.length === 0)
            return;
        const tx = this.db.transaction('outbox', 'readwrite');
        const store = tx.objectStore('outbox');
        for (const entry of entries)
            await store.put(entry);
        await tx.done;
    }
    async getOutbox(operationId) {
        return (await this.db.get('outbox', operationId)) ?? null;
    }
    /** Outbox en orden FIFO de encolado (cola serial). */
    async listOutbox() {
        return this.db.getAllFromIndex('outbox', 'by_queued');
    }
    async deleteOutbox(operationId) {
        await this.db.delete('outbox', operationId);
    }
    /** Transición de estado de una operación (pending → sent → confirmed). */
    /**
     * Marca como `rejected` las entradas pendientes de un path: el pull aplicó la versión
     * del server y publicar el snapshot local viejo pisaría esa revisión (el caso que hacía
     * que un conflicto "resuelto" volviera atrás en el ciclo siguiente).
     */
    async descartarOutboxDePath(pathId, motivo) {
        const entries = await this.db.getAll('outbox');
        const obsoletas = obsoletasDePath(entries, pathId);
        if (obsoletas.length === 0)
            return 0;
        const tx = this.db.transaction('outbox', 'readwrite');
        for (const entry of obsoletas) {
            await tx.store.put({ ...entry, state: 'rejected', lastError: motivo });
        }
        await tx.done;
        return obsoletas.length;
    }
    async setOutboxState(operationId, state, lastError) {
        const entry = await this.db.get('outbox', operationId);
        if (!entry)
            throw new Error(`outbox: no existe la operación ${operationId}`);
        const updated = { ...entry, state, lastError: lastError ?? null };
        await this.db.put('outbox', updated);
        return updated;
    }
    /**
     * Confirmación de un LOTE del push en UNA transacción de IndexedDB: base + índice +
     * outbox (borrado) + checkpoint. Antes eran 4 transacciones POR NOTA (~16,5 ms cada
     * una: el piso medido del T1); acá el lote entero paga el costo fijo UNA vez.
     * Es atómica: si el proceso muere, o se confirma el lote entero o nada (las entradas
     * siguen en `sent` y el reintento es idempotente).
     */
    async confirmarLote(items, checkpoint) {
        const tx = this.db.transaction(['base', 'index', 'outbox', 'checkpoint'], 'readwrite');
        const base = tx.objectStore('base');
        const index = tx.objectStore('index');
        const outbox = tx.objectStore('outbox');
        for (const item of items) {
            await base.put(item.base);
            await index.put(item.index);
            await outbox.delete(item.entry.operationId);
        }
        await tx.objectStore('checkpoint').put({
            id: 'checkpoint',
            since: checkpoint.since,
            minRev: checkpoint.minRev,
            updatedAt: Date.now(),
        });
        await tx.done;
    }
    // ------------------------------------------------------------------ transfers
    async putTransfer(entry) {
        await this.db.put('transfers', entry);
    }
    async getTransfer(transferId) {
        return (await this.db.get('transfers', transferId)) ?? null;
    }
    async listTransfers() {
        return this.db.getAllFromIndex('transfers', 'by_updated');
    }
    async deleteTransfer(transferId) {
        await this.db.delete('transfers', transferId);
    }
    // ------------------------------------------------------------------ intents
    async putIntent(entry) {
        await this.db.put('intents', entry);
    }
    async getIntent(intentId) {
        return (await this.db.get('intents', intentId)) ?? null;
    }
    /** Intenciones en un estado (recuperación al reiniciar: se listan las `pending`). */
    async listIntents(state) {
        if (state === undefined)
            return this.db.getAll('intents');
        return this.db.getAllFromIndex('intents', 'by_state', state);
    }
    async deleteIntent(intentId) {
        await this.db.delete('intents', intentId);
    }
    /** Intención → `verified` (hash/AEAD verificados, lista para publicar). */
    async markIntentVerified(intentId) {
        const intent = await this.db.get('intents', intentId);
        if (!intent)
            throw new Error(`apply: no existe la intención ${intentId}`);
        const updated = { ...intent, state: 'verified' };
        await this.db.put('intents', updated);
        return updated;
    }
    /**
     * Commit ATÓMICO del journal: cierra la intención y avanza base/índice/checkpoint en
     * UNA transacción de IndexedDB. `since` avanza SOLO por acá — recibir un frame no
     * equivale a aplicarlo, y un commit a medias no existe.
     */
    async completeApply(input) {
        const intent = await this.db.get('intents', input.intentId);
        if (!intent)
            throw new Error(`apply: no existe la intención ${input.intentId}`);
        const tx = this.db.transaction(['intents', 'base', 'index', 'checkpoint'], 'readwrite');
        await tx.objectStore('intents').delete(input.intentId);
        if (input.base)
            await tx.objectStore('base').put(input.base);
        if (input.index)
            await tx.objectStore('index').put(input.index);
        if (input.checkpoint) {
            await tx.objectStore('checkpoint').put({
                id: 'checkpoint',
                since: input.checkpoint.since,
                minRev: input.checkpoint.minRev,
                updatedAt: Date.now(),
            });
        }
        await tx.done;
    }
}
//# sourceMappingURL=StateStore.js.map