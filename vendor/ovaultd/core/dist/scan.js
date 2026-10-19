/**
 * Escaneo del vault y hash-diff contra la base sincronizada (fase 2, paso 4).
 *
 * El escaneo es solo-lectura: recorre el vault por el `FileSystemPort`, calcula
 * `path_id` y el sha256 de cada archivo, y no toca nada más. El diff compara contra la
 * base (la última revisión aplicada o empujada) y produce las operaciones candidatas.
 *
 * Decisiones:
 *  - Solo archivos: las carpetas existen implícitas en el server (el protocolo las
 *    soporta, pero el MVP no las empuja y la convergencia no las necesita).
 *  - Las exclusiones viven en `SyncFilter` (política única del núcleo): temporales del
 *    apply, configuración del vault, papelera, git anidado, node_modules. Acá solo se
 *    aplican — y "excluir no significa borrar": un path excluido que ya esté en la base
 *    NO se propone como borrado.
 *  - Sin heurística de rename en esta pasada: un rename se emite `del` + `add`, que es
 *    correcto SIEMPRE; la detección por `prev_path_id` es una optimización posterior.
 */
import { cryptoProvider, pathId as calcularPathId } from '@ovaultd/crypto';
import { toHex } from '@ovaultd/protocol';
import { estaExcluido } from './SyncFilter.js';
/** Recorre el vault completo (recursivo) y devuelve los archivos con su hash. */
export async function escanearVault(port, keys, dir = '', cache) {
    const archivos = [];
    const recorrer = async (relDir) => {
        // El puente rechaza '' (frontera estricta): la raíz del vault se pide como '.'.
        const listado = await port.list(relDir === '' ? '.' : relDir);
        for (const entrada of listado) {
            const rel = relDir === '' ? entrada.name : `${relDir}/${entrada.name}`;
            // Exclusiones PRIMERO: una carpeta excluida no se escanea NI se recursa.
            if (estaExcluido(rel))
                continue;
            if (entrada.isDirectory) {
                await recorrer(rel);
                continue;
            }
            if (!entrada.isFile)
                continue;
            archivos.push(rel);
        }
    };
    await recorrer(dir);
    // Stat MASIVO: un solo round-trip por todo el vault (el escaneo pagaba uno por archivo
    // contra el puente: 1000 POST en el bench). Sin `statMany` en el port, bucle clásico.
    const stats = port.statMany
        ? await port.statMany(archivos)
        : await Promise.all(archivos.map((rel) => port.stat(rel)));
    const salida = [];
    for (let i = 0; i < archivos.length; i += 1) {
        const rel = archivos[i];
        const stat = stats[i] ?? null;
        // Se fue entre el list y el stat: no hay nada que sincronizar de este path.
        if (stat === null)
            continue;
        // Escaneo incremental: si el archivo no cambió (mismo mtime y tamaño) el hash del
        // índice sigue valiendo y NO se lee el contenido. Un vault de 100 MB pasa de ~8 s
        // a milisegundos por ciclo. El riesgo de un mtime falseado lo cubren el watcher
        // (los cambios locales llegan por evento) y un rescan completo a demanda.
        const recordado = cache?.get(rel);
        if (recordado &&
            recordado.contentHash != null &&
            recordado.mtime === stat.mtimeMs &&
            recordado.size === stat.size) {
            salida.push({
                path: rel,
                pathId: toHex(calcularPathId(keys, rel)),
                contentHash: recordado.contentHash,
                size: stat.size,
                mtimeMs: stat.mtimeMs,
            });
            continue;
        }
        const bytes = await port.read(rel);
        salida.push({
            path: rel,
            pathId: toHex(calcularPathId(keys, rel)),
            contentHash: toHex(cryptoProvider().sha256(bytes)),
            size: bytes.length,
            mtimeMs: stat.mtimeMs,
        });
    }
    salida.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
    return salida;
}
/** Diff contra la base: qué falta empujar, con la outbox pendiente como filtro. */
export async function diffLocal(store, entradas) {
    const base = new Map((await store.listBase()).map((entrada) => [entrada.pathId, entrada]));
    const index = new Map((await store.listIndex()).map((entrada) => [entrada.pathId, entrada]));
    const pendientes = new Set((await store.listOutbox())
        .filter((entrada) => entrada.state !== 'confirmed')
        .map((entrada) => entrada.pathId));
    const enDisco = new Set();
    const diff = { nuevos: [], modificados: [], borrados: [], sinCambios: 0, yaEncolados: 0 };
    for (const archivo of entradas) {
        enDisco.add(archivo.pathId);
        const baseEntry = base.get(archivo.pathId);
        if (!baseEntry || baseEntry.contentHash == null) {
            // Nunca subido (o sin hash conocido): `add`. Si hay una operación pendiente del
            // MISMO path, no se re-encola (la outbox espera su turno).
            if (pendientes.has(archivo.pathId)) {
                diff.yaEncolados += 1;
            }
            else {
                diff.nuevos.push(archivo);
            }
            continue;
        }
        if (baseEntry.contentHash === archivo.contentHash) {
            diff.sinCambios += 1;
            continue;
        }
        if (pendientes.has(archivo.pathId)) {
            diff.yaEncolados += 1;
        }
        else {
            diff.modificados.push(archivo);
        }
    }
    // Borrados: base sin archivo en disco (y que el índice no tenga ya como tombstone).
    for (const [pathIdHex, baseEntry] of base) {
        if (enDisco.has(pathIdHex) || baseEntry.contentHash == null)
            continue;
        const indexEntry = index.get(pathIdHex);
        if (indexEntry?.deleted === true)
            continue;
        // Excluir NO significa borrar el remoto: un path hoy excluido jamás se propone `del`.
        if (indexEntry?.path && estaExcluido(indexEntry.path))
            continue;
        if (pendientes.has(pathIdHex)) {
            diff.yaEncolados += 1;
            continue;
        }
        diff.borrados.push({ pathId: pathIdHex, path: indexEntry?.path });
    }
    return diff;
}
/** Resumen humano del diff (lo usan `list-local` y los reportes de sync). */
export const resumirDiff = (diff) => `nuevos=${diff.nuevos.length} modificados=${diff.modificados.length} ` +
    `borrados=${diff.borrados.length} sinCambios=${diff.sinCambios} yaEncolados=${diff.yaEncolados}`;
//# sourceMappingURL=scan.js.map