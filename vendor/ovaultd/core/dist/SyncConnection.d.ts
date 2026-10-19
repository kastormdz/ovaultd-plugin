/**
 * `SyncConnection` — la sesión contra el wire v2, desde el núcleo (Chromium).
 *
 *  - HTTP: control (`changes`) y blobs (GET/PUT).
 *  - WS: handshake `hello → hello_ok → auth → auth_ok` y **commits** (único camino).
 *  - Auth del upgrade sin headers: subprotocolos `ovaultd.v1, ovaultd.bearer.<token>`
 *    (ADR-0015) — la WebSocket API del navegador no permite headers.
 *
 * Este módulo NO descifra ni decide: firma lo que le piden (`sign2`), espera respuestas
 * y clasifica frames (`notify`/`ack` se encolan, un `error` rechaza la espera en curso).
 */
import { type SubKeys } from '@ovaultd/crypto';
import { type BatchAckWire, type BatchWire, type ChangesWire, type ConflictWire, type HistoryWire, type ServerMessageWire } from '@ovaultd/protocol';
export declare class SyncHttpError extends Error {
    readonly status: number;
    readonly code: string | null;
    constructor(status: number, code: string | null, detail: string | null);
}
/** El server rechazó por WS (`{t:"error"}`): no es transitorio por sí solo. */
export declare class SyncRejectedError extends Error {
    readonly code: string | null;
    constructor(code: string | null, detail: string | null);
}
/** El batch perdió la carrera del CAS: hay que rebasear (fase 5). */
export declare class SyncConflictError extends Error {
    readonly conflicto: ConflictWire;
    constructor(conflicto: ConflictWire);
}
export interface SyncConnectionOptions {
    /** `http(s)://host[:puerto]`, sin slash final. */
    baseUrl: string;
    token: string;
    vault: number;
    device: number;
    keys: SubKeys;
    /**
     * Se llama cuando el server avisa que hay revisiones nuevas (`notify`). Es una **señal**, no un
     * dato: quien la recibe tiene que hacer un pull con su `since`. El server no avisa al dispositivo
     * que produjo el lote, así que un aviso siempre significa que hay algo que bajar.
     */
    alRecibirAviso?: () => void;
    /**
     * `fetch` alternativo para las llamadas HTTP del cliente (los PUT de blobs y los GET).
     * El runtime de la página lo usa para pasar por el PUENTE (mismo origen): el navegador
     * no puede compartir el cache del preflight CORS entre URLs distintas y cada blob es
     * una URL propia — sin esto paga un OPTIONS de ~40 ms POR blob.
     */
    fetchImpl?: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
}
export declare class SyncConnection {
    private readonly opciones;
    private ws;
    private espera;
    /** Frames `notify`/`ack` que llegaron fuera de una espera (nudge vivo; se drenan del server igual). */
    readonly notificaciones: ServerMessageWire[];
    constructor(opciones: SyncConnectionOptions);
    private get base();
    private headers;
    private wsUrl;
    /** Abre la sesión: upgrade + handshake completo. Devuelve el `head_rev` del server. */
    open({ since }: {
        since: number;
    }): Promise<{
        headRev: number;
    }>;
    /** Delta HTTP desde `since` (revisión completa, con cursor). */
    pull(since: number, limit?: number): Promise<ChangesWire>;
    /**
     * Historia de un archivo (LECTURA pura del oplog): página por `path_id` (hex), más
     * nueva primero, con la cadena de renames ya resuelta por el server. `before` acota
     * (`rev < before`). Nada viaja descifrado: el llamador resuelve nombres con `path_enc`.
     */
    historial(pathIdHex: string, before?: number, limit?: number): Promise<HistoryWire>;
    /** Descarga un blob del CAS (el llamador verifica que los bytes hasheen al `blob_id`). */
    getBlob(blobIdHex: string): Promise<Uint8Array>;
    /** Publica un blob (el contenido ya cifrado, con su sobre). */
    putBlob(blobIdHex: string, bytes: Uint8Array): Promise<void>;
    /**
     * Commit por WS (ÚNICO camino). Un `conflict` no es un error de red: es el resultado
     * del CAS y se lanza como `SyncConflictError` para que el llamador rebasee.
     */
    commit(batch: BatchWire): Promise<BatchAckWire>;
    /**
     * ¿Hay una sesión viva? El socket puede haberse cerrado (se cayó la red, o el server cierra
     * el WS) mientras este objeto sigue existiendo: preguntar por el objeto no alcanza.
     */
    estaAbierta(): boolean;
    close(): void;
    private enviar;
    private esperar;
    private onMensaje;
    private onCierre;
    private json;
    private lanzar;
}
//# sourceMappingURL=SyncConnection.d.ts.map