/**
 * Puerto de filesystem del núcleo: el runtime NO toca archivos directamente — le pide
 * operaciones a un puente que las ejecuta confinadas al vault. En el CLI, ese puente es
 * el `NodeFileAdapter` detrás del servidor local (127.0.0.1); en el plugin de Obsidian
 * será la API del vault. Las rutas son SIEMPRE relativas al vault: el que impone el
 * límite es el puente, no el llamador.
 */
import { b64Decode, b64Encode } from '@ovaultd/protocol';
/** Implementación sobre el puente HTTP del runtime (mismo origen que sirve la página). */
export class HttpFileSystemPort {
    baseUrl;
    constructor(baseUrl) {
        this.baseUrl = baseUrl;
    }
    async op(nombre, params) {
        const respuesta = await fetch(`${this.baseUrl}/fs/${nombre}`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(params),
        });
        const datos = (await respuesta.json());
        if (!datos.ok)
            throw new Error(`fs ${nombre}: ${datos.error?.message ?? 'error desconocido'}`);
        return datos.result;
    }
    stat(relPath) {
        return this.op('stat', { path: relPath });
    }
    async read(relPath) {
        const result = await this.op('read', { path: relPath });
        return b64Decode(result.b64);
    }
    writeTemp(relDir, bytes) {
        return this.op('writeTemp', { dir: relDir, b64: b64Encode(bytes) });
    }
    async rename(fromRel, toRel) {
        await this.op('rename', { from: fromRel, to: toRel });
    }
    async unlink(relPath) {
        await this.op('unlink', { path: relPath });
    }
    async mkdirp(relPath) {
        await this.op('mkdirp', { path: relPath });
    }
    list(relDir) {
        return this.op('list', { path: relDir });
    }
}
//# sourceMappingURL=file-port.js.map