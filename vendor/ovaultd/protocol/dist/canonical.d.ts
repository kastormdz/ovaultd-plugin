/**
 * Helpers canónicos del wire v2: bytes, base64, hex y NFKC.
 *
 * Reglas (`docs/protocol.md`, `docs/implementation-map.md` § 6):
 * - Todo campo binario viaja en JSON como **base64 estándar con padding** (RFC 4648).
 * - El `operation_id` del batch viaja como **hex con guiones tolerados**; la delta lo
 *   devuelve en **base64** (16 B). El parser ÚNICO de la forma textual es
 *   `operationIdFromWire` (mismo comportamiento que `OperationId::from_wire` en Rust).
 * - Hex es para humanos (logs, CLI); el protocolo jamás lo usa salvo el caso anterior.
 *
 * Implementación sin dependencias y sin `Buffer`: el mismo código corre en Node
 * (CLI) y en el navegador (plugin de Obsidian).
 */
export declare const textEncoder: TextEncoder;
export declare const textDecoder: TextDecoder;
/** Normalización NFKC — la ÚNICA forma válida de passwords y paths antes de cifrar/firmar. */
export declare const nfkc: (text: string) => string;
export declare const concat: (...parts: Uint8Array[]) => Uint8Array;
export declare const equalBytes: (a: Uint8Array, b: Uint8Array) => boolean;
export declare const u8: (value: number) => Uint8Array;
export declare const u16be: (value: number) => Uint8Array;
export declare const u32be: (value: number) => Uint8Array;
export declare const u64be: (value: number | bigint) => Uint8Array;
export declare const toHex: (bytes: Uint8Array) => string;
export declare const fromHex: (text: string) => Uint8Array;
/** Codifica base64 estándar con padding (el mismo motor que el server: STANDARD). */
export declare const b64Encode: (bytes: Uint8Array) => string;
/**
 * Decodifica base64 estándar. Estricto como el motor del server: longitud múltiplo de 4,
 * padding solo al final, bits de padding en cero. Cualquier otra cosa lanza.
 */
export declare const b64Decode: (text: string) => Uint8Array;
/** Valida y devuelve un identificador binario de longitud fija. */
export declare const expectBytes: (bytes: Uint8Array, length: number, what: string) => Uint8Array;
//# sourceMappingURL=canonical.d.ts.map