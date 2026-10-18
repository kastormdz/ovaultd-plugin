/**
 * Reconcile — el ciclo de convergencia (lado PULL de fase 2; el drenaje de la outbox
 * llega con el comando `sync` del CLI).
 *
 * Reglas:
 *  - `since` avanza SOLO por `completeApply` (aplicación recuperable) — acá no se toca.
 *  - Una revisión `blocked` CORTA el ciclo: el checkpoint no puede saltar una revisión
 *    sin aplicar, así que nada posterior se aplica hasta resolverla (fase 5).
 *  - `min_rev` mayor que `since` ⇒ **resync**: se informa SIN borrar nada — la outbox
 *    y el estado local se preservan (jamás "arreglar" el cursor borrando estado).
 */
import { decryptPathEnc } from '@ovaultd/crypto';
import { b64Decode, fromHex, toHex } from '@ovaultd/protocol';
import { applyRevision } from './apply-runner.js';
const CERO_32 = '00'.repeat(32);
/** ¿El `blob_id` de la delta es el centinela de "sin blob" (carpeta)? */
const sinBlob = (blobIdB64) => {
    try {
        return toHex(b64Decode(blobIdB64)) === CERO_32;
    }
    catch {
        return false;
    }
};
async function aplicarRegistro(deps, conn, registro) {
    const { store, keys } = deps;
    const pathIdHex = toHex(b64Decode(registro.path_id));
    const deleted = registro.op === 'del';
    const folder = !deleted && sinBlob(registro.blob_id);
    // El `path` sale del path_enc (registros con contenido) o del índice local (tombstones:
    // la delta no manda path_enc en `del`). Un borrado de algo que nunca vimos no toca el vault.
    let path = '';
    if (!deleted && registro.path_enc) {
        path = decryptPathEnc(keys, b64Decode(registro.path_enc), fromHex(pathIdHex));
    }
    else if (deleted) {
        path = (await store.getIndex(pathIdHex))?.path ?? '';
    }
    const revision = {
        pathId: pathIdHex,
        path,
        kind: folder ? 'folder' : 'file',
        deleted,
        rev: registro.rev,
        blobId: deleted || folder ? null : toHex(b64Decode(registro.blob_id)),
        // La delta no trae content_hash: la integridad la da el AEAD del blob (ADR-0014).
        contentHash: null,
    };
    let stored = null;
    if (!deleted && !folder) {
        stored = await conn.getBlob(revision.blobId);
    }
    const resultado = await applyRevision(deps, revision, stored);
    if (resultado.status === 'blocked') {
        return { aplicado: false, bloqueado: { reason: resultado.reason } };
    }
    return { aplicado: true };
}
/** Una pasada de convergencia (pull). No reconecta: eso es de `retry`/llamador. */
export async function pullOnce(conn, deps) {
    const checkpoint = await deps.store.readCheckpoint().catch(() => null);
    let cursor = checkpoint?.since ?? 0;
    let applied = 0;
    for (;;) {
        const cambios = await conn.pull(cursor);
        if (cambios.min_rev != null && cursor < cambios.min_rev) {
            return {
                status: 'resync-required',
                applied,
                headRev: cursor,
                resync: { since: cursor, minRev: cambios.min_rev },
            };
        }
        for (const registro of cambios.items) {
            const resultado = await aplicarRegistro(deps, conn, registro);
            if (resultado.bloqueado) {
                return {
                    status: 'blocked',
                    applied,
                    headRev: cursor,
                    blocked: { rev: registro.rev, pathId: toHex(b64Decode(registro.path_id)), reason: resultado.bloqueado.reason },
                };
            }
            applied += 1;
        }
        const siguiente = cambios.next_since;
        if (siguiente <= cursor)
            break; // la página no avanzó: no hay más
        cursor = siguiente;
    }
    return { status: 'pulled', applied, headRev: cursor };
}
//# sourceMappingURL=reconcile.js.map