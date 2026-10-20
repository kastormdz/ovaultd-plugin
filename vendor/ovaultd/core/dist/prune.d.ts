/**
 * prune — reconciliación de los paths vivos del server contra el disco local.
 *
 * El server es ciego (E2EE): no puede listar paths ni ver el filesystem. Un
 * borrado local que nunca pasó por el sync (a mano, con el cliente apagado, o
 * en un vault viejo) deja el path vivo en `files` para siempre, y el panel lo
 * cuenta como nota. Este módulo baja el oplog COMPLETO, lo colapsa por path_id
 * (gana la última op; un `del` lo saca) y compara cada ruta viva contra el
 * disco. Por defecto es una LECTURA: solo `aplicarPrune` encola los `del`.
 */
import { type SubKeys } from '@ovaultd/crypto';
import type { FileSystemPort } from './file-port.js';
import type { StateStore } from './StateStore.js';
import type { SyncConnection } from './SyncConnection.js';
interface EntradaViva {
    blobId: string;
    pathEnc: string;
}
/** Trae el delta COMPLETO (paginado) y lo colapsa al estado vivo por `path_id`. */
export declare function estadoVivoDelServer(conn: SyncConnection): Promise<Map<string, EntradaViva>>;
export interface PlanDePrune {
    /** Paths vivos según el server. */
    vivos: number;
    /** Vivos que SÍ existen en el disco local. */
    enDisco: number;
    /** Vivos que no existen en el disco: los que el panel cuenta de más. */
    huerfanos: string[];
    /** `path_enc` que no descifra con estas claves. */
    ilegibles: number;
    /** Rutas que la política portable rechaza (nunca se borran a ciegas). */
    bloqueadas: number;
}
export interface DepsPrune {
    conn: SyncConnection;
    keys: SubKeys;
    port: FileSystemPort;
}
export declare function planificarPrune(deps: DepsPrune): Promise<PlanDePrune>;
export interface ResultadoPrune extends PlanDePrune {
    /** Cuántos `del` quedaron encolados (0 si no se aplicó o no había huérfanos). */
    encolados: number;
}
/**
 * Encola un `del` por cada huérfano. No publica: el que llama corre el push
 * normal después (`pushOnce`), para que el lote salga con la firma y el
 * `expected_rev` de siempre.
 */
export declare function aplicarPrune(deps: DepsPrune & {
    store: StateStore;
}): Promise<ResultadoPrune>;
export {};
//# sourceMappingURL=prune.d.ts.map