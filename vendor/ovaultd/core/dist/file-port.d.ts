/**
 * Puerto de filesystem del núcleo: el runtime NO toca archivos directamente — le pide
 * operaciones a un puente que las ejecuta confinadas al vault. En el CLI, ese puente es
 * el `NodeFileAdapter` detrás del servidor local (127.0.0.1); en el plugin de Obsidian
 * será la API del vault. Las rutas son SIEMPRE relativas al vault: el que impone el
 * límite es el puente, no el llamador.
 */
export interface VaultStat {
    size: number;
    mtimeMs: number;
    isFile: boolean;
    isDirectory: boolean;
}
export interface VaultDirEntry {
    name: string;
    isFile: boolean;
    isDirectory: boolean;
}
export interface FileSystemPort {
    stat(relPath: string): Promise<VaultStat | null>;
    read(relPath: string): Promise<Uint8Array>;
    /** Escribe un temporal en `relDir`; devuelve su nombre (relativo al vault). */
    writeTemp(relDir: string, bytes: Uint8Array): Promise<{
        tempName: string;
    }>;
    rename(fromRel: string, toRel: string): Promise<void>;
    unlink(relPath: string): Promise<void>;
    mkdirp(relPath: string): Promise<void>;
    list(relDir: string): Promise<VaultDirEntry[]>;
}
/** Implementación sobre el puente HTTP del runtime (mismo origen que sirve la página). */
export declare class HttpFileSystemPort implements FileSystemPort {
    private readonly baseUrl;
    constructor(baseUrl: string);
    private op;
    stat(relPath: string): Promise<VaultStat | null>;
    read(relPath: string): Promise<Uint8Array>;
    writeTemp(relDir: string, bytes: Uint8Array): Promise<{
        tempName: string;
    }>;
    rename(fromRel: string, toRel: string): Promise<void>;
    unlink(relPath: string): Promise<void>;
    mkdirp(relPath: string): Promise<void>;
    list(relDir: string): Promise<VaultDirEntry[]>;
}
//# sourceMappingURL=file-port.d.ts.map