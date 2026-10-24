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
import { identityFromSubkeys, signProof } from '@ovaultd/crypto';
import { b64Decode, b64Encode, } from '@ovaultd/protocol';
export class SyncHttpError extends Error {
    status;
    code;
    constructor(status, code, detail) {
        super(`HTTP ${status}${code ? ` (${code})` : ''}${detail ? `: ${detail}` : ''}`);
        this.name = 'SyncHttpError';
        this.status = status;
        this.code = code;
    }
}
/** El server rechazó por WS (`{t:"error"}`): no es transitorio por sí solo. */
export class SyncRejectedError extends Error {
    code;
    constructor(code, detail) {
        super(`server rechazó${code ? ` (${code})` : ''}${detail ? `: ${detail}` : ''}`);
        this.name = 'SyncRejectedError';
        this.code = code;
    }
}
/** El batch perdió la carrera del CAS: hay que rebasear (fase 5). */
export class SyncConflictError extends Error {
    conflicto;
    constructor(conflicto) {
        super(`conflicto en ${conflicto.path_id} (base ${conflicto.base_rev}, server ${conflicto.server_rev}, cliente ${conflicto.client_rev})`);
        this.name = 'SyncConflictError';
        this.conflicto = conflicto;
    }
}
/** base64url sin padding (el token va en un subprotocolo; `=` no es un token válido). */
const b64url = (texto) => {
    const bytes = new TextEncoder().encode(texto);
    let binario = '';
    for (const byte of bytes)
        binario += String.fromCharCode(byte);
    return btoa(binario).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
export class SyncConnection {
    opciones;
    ws = null;
    espera = null;
    /** Frames `notify`/`ack` que llegaron fuera de una espera (nudge vivo; se drenan del server igual). */
    notificaciones = [];
    constructor(opciones) {
        this.opciones = opciones;
    }
    get base() {
        return this.opciones.baseUrl.replace(/\/+$/, '');
    }
    headers() {
        return { authorization: `Bearer ${this.opciones.token}` };
    }
    wsUrl() {
        const url = new URL(this.base);
        url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
        url.pathname = '/api/v1/ws';
        url.search = '';
        return url.toString();
    }
    /** Abre la sesión: upgrade + handshake completo. Devuelve el `head_rev` del server. */
    async open({ since }) {
        if (this.ws)
            throw new Error('SyncConnection: ya está abierta');
        const bearer = `ovaultd.bearer.${b64url(this.opciones.token)}`;
        const ws = new WebSocket(this.wsUrl(), ['ovaultd.v1', bearer]);
        this.ws = ws;
        await new Promise((resolver, rechazar) => {
            ws.onopen = () => resolver();
            ws.onerror = () => rechazar(new Error(`WS: no se pudo abrir ${this.wsUrl()}`));
        });
        ws.onmessage = (evento) => this.onMensaje(evento);
        ws.onclose = () => this.onCierre();
        this.enviar({
            t: 'hello',
            proto: 1,
            vault: this.opciones.vault,
            device: this.opciones.device,
            since,
            ...(this.opciones.appVersion ? { app_version: this.opciones.appVersion } : {}),
        });
        const helloOk = (await this.esperar(['hello_ok']));
        const challenge = b64Decode(helloOk.challenge);
        const proof = signProof(identityFromSubkeys(this.opciones.keys), this.opciones.vault, this.opciones.device, challenge);
        this.enviar({ t: 'auth', proof: b64Encode(proof) });
        await this.esperar(['auth_ok']);
        return { headRev: helloOk.head_rev };
    }
    /** Delta HTTP desde `since` (revisión completa, con cursor). */
    async pull(since, limit = 100) {
        const respuesta = await fetch(`${this.base}/api/v1/vaults/${this.opciones.vault}/changes?since=${since}&limit=${limit}`, { headers: this.headers() });
        return this.json(respuesta);
    }
    /**
     * Historia de un archivo (LECTURA pura del oplog): página por `path_id` (hex), más
     * nueva primero, con la cadena de renames ya resuelta por el server. `before` acota
     * (`rev < before`). Nada viaja descifrado: el llamador resuelve nombres con `path_enc`.
     */
    async historial(pathIdHex, before, limit = 50) {
        const params = new URLSearchParams({ path_id: pathIdHex, limit: String(limit) });
        if (before !== undefined)
            params.set('before', String(before));
        const respuesta = await fetch(`${this.base}/api/v1/vaults/${this.opciones.vault}/history?${params.toString()}`, { headers: this.headers() });
        return this.json(respuesta);
    }
    /** Descarga un blob del CAS (el llamador verifica que los bytes hasheen al `blob_id`). */
    async getBlob(blobIdHex) {
        const respuesta = await fetch(`${this.base}/api/v1/vaults/${this.opciones.vault}/blobs/${blobIdHex}`, { headers: this.headers() });
        if (!respuesta.ok)
            await this.lanzar(respuesta);
        return new Uint8Array(await respuesta.arrayBuffer());
    }
    /** Publica un blob (el contenido ya cifrado, con su sobre). */
    async putBlob(blobIdHex, bytes) {
        const fetchFn = this.opciones.fetchImpl ?? fetch;
        const respuesta = await fetchFn(`${this.base}/api/v1/vaults/${this.opciones.vault}/blobs/${blobIdHex}`, {
            method: 'PUT',
            headers: { ...this.headers(), 'content-type': 'application/octet-stream' },
            body: new Uint8Array(bytes).buffer,
        });
        if (!respuesta.ok)
            await this.lanzar(respuesta);
    }
    /**
     * Commit por WS (ÚNICO camino). Un `conflict` no es un error de red: es el resultado
     * del CAS y se lanza como `SyncConflictError` para que el llamador rebasee.
     */
    async commit(batch) {
        if (!this.ws)
            throw new Error('SyncConnection: sin conexión abierta');
        const espera = this.esperar(['batch_ack', 'conflict']);
        this.enviar(batch);
        const mensaje = await espera;
        if (mensaje.t === 'conflict')
            throw new SyncConflictError(mensaje);
        const ack = mensaje;
        if (ack.batch_id !== batch.batch_id) {
            throw new Error(`WS: ack de otro batch (${ack.batch_id} != ${batch.batch_id})`);
        }
        return ack;
    }
    /**
     * ¿Hay una sesión viva? El socket puede haberse cerrado (se cayó la red, o el server cierra
     * el WS) mientras este objeto sigue existiendo: preguntar por el objeto no alcanza.
     */
    estaAbierta() {
        return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
    }
    close() {
        this.ws?.close();
        this.ws = null;
    }
    // ------------------------------------------------------------------ interno
    enviar(mensaje) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            throw new Error('SyncConnection: WS no está abierto');
        }
        this.ws.send(JSON.stringify(mensaje));
    }
    esperar(tipos) {
        if (this.espera)
            throw new Error('SyncConnection: ya hay una espera en curso');
        return new Promise((resolver, rechazar) => {
            this.espera = { tipos, resolver, rechazar };
        });
    }
    onMensaje(evento) {
        if (typeof evento.data !== 'string')
            return;
        let mensaje;
        try {
            mensaje = JSON.parse(evento.data);
        }
        catch {
            return;
        }
        const tipo = mensaje.t ?? '';
        if (tipo === 'notify' || tipo === 'ack') {
            this.notificaciones.push(mensaje);
            if (this.notificaciones.length > 100)
                this.notificaciones.shift();
            if (tipo === 'notify')
                this.opciones.alRecibirAviso?.();
            return;
        }
        const espera = this.espera;
        if (!espera)
            return; // nadie esperando: se descarta (no se adivina)
        this.espera = null;
        if (tipo === 'error') {
            espera.rechazar(new SyncRejectedError(mensaje.code ?? null, mensaje.detail ?? null));
            return;
        }
        if (!espera.tipos.includes(tipo)) {
            espera.rechazar(new Error(`WS: mensaje inesperado '${tipo}'`));
            return;
        }
        espera.resolver(mensaje);
    }
    onCierre() {
        const espera = this.espera;
        this.espera = null;
        this.ws = null;
        espera?.rechazar(new Error('WS: la conexión se cerró'));
    }
    async json(respuesta) {
        if (!respuesta.ok)
            await this.lanzar(respuesta);
        return (await respuesta.json());
    }
    async lanzar(respuesta) {
        let code = null;
        let detail = null;
        try {
            const cuerpo = (await respuesta.json());
            code = typeof cuerpo.code === 'string' ? cuerpo.code : null;
            detail = typeof cuerpo.detail === 'string' ? cuerpo.detail : null;
        }
        catch {
            /* sin cuerpo JSON */
        }
        throw new SyncHttpError(respuesta.status, code, detail);
    }
}
//# sourceMappingURL=SyncConnection.js.map