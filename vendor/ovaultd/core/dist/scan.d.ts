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
import { type SubKeys } from '@ovaultd/crypto';
import type { FileSystemPort } from './file-port.js';
import type { StateStore } from './StateStore.js';
export interface EntradaEscaneada {
    path: string;
    /** `path_id` en hex. */
    pathId: string;
    /** sha256 hex del contenido. */
    contentHash: string;
    size: number;
    mtimeMs: number;
}
export interface DiffLocal {
    nuevos: EntradaEscaneada[];
    modificados: EntradaEscaneada[];
    borrados: Array<{
        pathId: string;
        path?: string;
    }>;
    /** Paths que existían en el listado pero no se pudieron stat/leer en este ciclo. */
    ilegibles: string[];
    sinCambios: number;
    /** Cambios ya encolados (outbox pendiente): el diff NO los vuelve a encolar. */
    yaEncolados: number;
}
/** Recorre el vault completo (recursivo) y devuelve los archivos con su hash. */
export declare function escanearVault(port: FileSystemPort, keys: SubKeys, dir?: string, cache?: Map<string, {
    mtime: number | null;
    size: number | null;
    contentHash: string | null;
}>, 
/** Si se pasa, el escaneo deja acá los bytes leídos: el push los reusa para encolar el
 *  snapshot en vez de volver a pedir cada archivo al puente (una lectura por archivo). */
contenidos?: Map<string, Uint8Array>, 
/** Salida: `pathId` hex -> path de los archivos que no se pudieron stat/leer. Un fallo
 *  de lectura (EACCES, EIO, ELOOP) NO es un borrado: el diff los excluye. */
ilegibles?: Map<string, string>, 
/** Config dir del vault (`.obsidian` o el custom): de ahí sale lo que se excluye. */
configDir?: string): Promise<EntradaEscaneada[]>;
/** Diff contra la base: qué falta empujar, con la outbox pendiente como filtro. */
export declare function diffLocal(store: StateStore, entradas: EntradaEscaneada[], ilegibles?: Map<string, string>, 
/** Config dir del vault: las entradas del índice que viven ahí no cuentan como borrado. */
configDir?: string): Promise<DiffLocal>;
/** Resumen humano del diff (lo usan `list-local` y los reportes de sync). */
export declare const resumirDiff: (diff: DiffLocal) => string;
//# sourceMappingURL=scan.d.ts.map