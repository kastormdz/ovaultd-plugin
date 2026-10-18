/**
 * Export — baja el HEAD completo de un vault y lo deja escrito y descifrado.
 *
 * A diferencia del pull (que aplica deltas al vault y mueve el checkpoint), el export es
 * una LECTURA pura: no toca el estado de sync y escribe donde el puerto le diga (fs del
 * SO en el plugin de escritorio, un directorio del CLI, memoria en los tests).
 *
 * Reglas:
 *  - El delta se pide desde `since = 0` y se COLPASA por `path_id`: gana la última
 *    revisión viva de cada ruta; un `del` la saca. Las carpetas no se materializan
 *    (los archivos crean sus padres; una carpeta vacía no existe en el export).
 *  - Cada ruta descifrada se VALIDA antes de escribir (misma política portable que el
 *    apply): una ruta hostil del server no puede escapar del destino.
 *  - Con `omitirExistentes` (default), lo que ya está en el destino no se pisa.
 */
import { type SubKeys } from '@ovaultd/crypto';
import type { SyncConnection } from './SyncConnection.js';
/** El destino del export. El plugin lo implementa con fs (escritorio); el CLI con node:fs. */
export interface PuertoDeExport {
    /** Escribe `contenido` en `ruta` (relativa y ya validada), creando los padres. */
    escribir(ruta: string, contenido: Uint8Array): Promise<void>;
    /** ¿Ya existe `ruta` en el destino? */
    existe(ruta: string): Promise<boolean>;
}
export interface ResultadoExport {
    /** Archivos escritos (nuevos, o reescritos si `omitirExistentes` es false). */
    escritas: number;
    /** Archivos que ya existían y se omitieron. */
    omitidas: number;
    /** Rutas del server que la política portable rechazó: NUNCA se escriben. */
    bloqueadas: number;
    /** Bytes en claro escritos. */
    bytes: number;
}
export interface OpcionesExport {
    conn: SyncConnection;
    keys: SubKeys;
    puerto: PuertoDeExport;
    /** `true` (default): no reescribe un archivo que ya existe en el destino. */
    omitirExistentes?: boolean;
    onProgreso?: (hechos: number, total: number) => void;
}
export declare function exportarVault(opciones: OpcionesExport): Promise<ResultadoExport>;
//# sourceMappingURL=export.d.ts.map