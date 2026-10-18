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
import { type BatchAckWire, type BatchWire, type ChangesWire, type ConflictWire, type ServerMessageWire } from '@ovaultd/protocol';
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
    /** Descarga un blob del CAS (el llamador verifica que los bytes hasheen al `blob_id`). */
    getBlob(blobIdHex: string): Promise<Uint8Array>;
    /** Publica un blob (el contenido ya cifrado, con su sobre). */
    putBlob(blobIdHex: string, bytes: Uint8Array): Promise<void>;
    /**
     * Commit por WS (ÚNICO camino). Un `conflict` no es un error de red: es el resultado
     * del CAS y se lanza como `SyncConflictError` para que el llamador rebasee.
     */
    commit(batch: BatchWire): Promise<BatchAckWire>;
    close(): void;
    private enviar;
    private esperar;
    private onMensaje;
    private onCierre;
    private json;
    private lanzar;
}
//# sourceMappingURL=SyncConnection.d.ts.map