/**
 * Mensajes y constantes del protocolo v2 — el contrato tal como lo habla el server.
 *
 * Fuente de verdad: `crates/ovaultd-protocol` (Rust) y `docs/server-interfaces.md`.
 * Este archivo NO inventa: cada campo, forma y error corresponde al comportamiento
 * verificado del server (los DTOs reales de las rutas, no la prosa de los docs).
 */
import { textEncoder } from './canonical.js';
// ---------------------------------------------------------------------------
// Constantes de protocolo
// ---------------------------------------------------------------------------
/** Versión de cifrado del protocolo. */
export const ENC_VERSION = 'sync2';
/** Tope de **contenido** (plaintext) por archivo (ADR-0007). */
export const MAX_FILE_BYTES = 33_554_432;
/**
 * Sobre del blob almacenado: `nonce[24] ‖ ciphertext ‖ tag[16]` (ADR-0014).
 * El cuerpo cifrado que viaja por el wire es el blob almacenado: el tope del
 * cuerpo es el tope de contenido + estos 40 bytes.
 */
export const BLOB_ENVELOPE_BYTES = 40;
/** Tope de operaciones por batch: superarlo es `bad_request`. */
export const MAX_BATCH_OPS = 1000;
// ---------------------------------------------------------------------------
// Operaciones
// ---------------------------------------------------------------------------
/**
 * Discriminantes del enum `Op` en el JSON del wire (la forma numérica que el `Deserialize`
 * tolera; la forma textual `"add"`/`"mod"`/… es la que usamos).
 */
export const OP_ADD = 1;
export const OP_MOD = 2;
export const OP_DEL = 3;
export const OP_MOVE = 4;
/**
 * Códigos de operación que firma `msg_rec` — el mapeo de `commit.rs::verify_batch_operation`
 * (`Add => 0, Mod => 1, Del => 2, Move => 3`). **NO** son los discriminantes del enum:
 * firmar con `OP_ADD` (1) produce una firma que el server rechaza.
 */
export const SIGN_OP_ADD = 0;
export const SIGN_OP_MOD = 1;
export const SIGN_OP_DEL = 2;
export const SIGN_OP_MOVE = 3;
/** Código de firma para una operación del wire. */
export const signOpCode = (op) => {
    switch (op) {
        case 'add':
            return SIGN_OP_ADD;
        case 'mod':
            return SIGN_OP_MOD;
        case 'del':
            return SIGN_OP_DEL;
        case 'move':
            return SIGN_OP_MOVE;
    }
};
const OP_WIRE_BY_CODE = {
    [OP_ADD]: 'add',
    [OP_MOD]: 'mod',
    [OP_DEL]: 'del',
    [OP_MOVE]: 'move',
};
const OP_CODE_BY_WIRE = {
    add: OP_ADD,
    mod: OP_MOD,
    del: OP_DEL,
    move: OP_MOVE,
};
/** Convierte un código de operación a su forma del wire. */
export const opToWire = (code) => OP_WIRE_BY_CODE[code];
/**
 * Parsea la forma del wire de una operación: string (`"add"`) o código numérico.
 * Equivale al `Deserialize` de `Op` en Rust; devuelve `null` si no es válida.
 */
export const opFromWire = (value) => {
    if (typeof value === 'string')
        return OP_CODE_BY_WIRE[value] ?? null;
    if (typeof value === 'number' && Number.isInteger(value)) {
        return value === OP_ADD || value === OP_MOD || value === OP_DEL || value === OP_MOVE
            ? value
            : null;
    }
    return null;
};
// ---------------------------------------------------------------------------
// Códigos de error (lista cerrada — ampliarla requiere un ADR)
// ---------------------------------------------------------------------------
export const ERROR_CODES = [
    'unauthorized',
    'not_found',
    'bad_request',
    'max_file_exceeded',
    'quota_exceeded',
    'resync_required',
    'internal',
];
export const isErrorCode = (value) => typeof value === 'string' && ERROR_CODES.includes(value);
// ---------------------------------------------------------------------------
// OperationId: hex con guiones tolerados (batch) ⇄ 16 bytes (delta lo devuelve b64)
// ---------------------------------------------------------------------------
/**
 * Parsea la forma textual del wire de un `operation_id`: hexadecimal con guiones
 * tolerados. Es el port exacto de `OperationId::from_wire` (Rust): la escritura
 * (batch) y la lectura (delta) comparten este único parser.
 *
 * Lanza si hay caracteres inválidos, si sobra o falta algún dígito.
 */
export const operationIdFromWire = (text) => {
    const bytes = new Uint8Array(16);
    let index = 0;
    let high = null;
    for (const byte of textEncoder.encode(text)) {
        if (byte === 0x2d)
            continue; // '-'
        let nibble;
        if (byte >= 0x30 && byte <= 0x39)
            nibble = byte - 0x30;
        else if (byte >= 0x61 && byte <= 0x66)
            nibble = byte - 0x61 + 10;
        else if (byte >= 0x41 && byte <= 0x46)
            nibble = byte - 0x41 + 10;
        else
            throw new Error('operation_id con carácter inválido');
        if (high !== null) {
            if (index >= bytes.length)
                throw new Error('operation_id demasiado largo');
            bytes[index] = (high << 4) | nibble;
            index += 1;
            high = null;
        }
        else {
            high = nibble;
        }
    }
    if (index === bytes.length && high === null)
        return bytes;
    throw new Error('operation_id incompleto');
};
// ---------------------------------------------------------------------------
// Validación de contenido (espejo de `check_content_size` + `Batch::validate`)
// ---------------------------------------------------------------------------
/** Devuelve el `ErrorCode` del tope de contenido, o `null` si entra. */
export const checkContentSize = (size) => size > MAX_FILE_BYTES ? 'max_file_exceeded' : null;
/** Espejo de `BatchOp::validate` — misma tabla de restricciones. */
export const validateBatchOp = (op) => {
    const hasBlob = op.blob_id !== null && op.blob_id !== undefined;
    const hasPathEnc = op.path_enc !== null && op.path_enc !== undefined;
    const hasSize = op.size !== null && op.size !== undefined;
    const hasPrev = op.prev_path_id !== null && op.prev_path_id !== undefined;
    switch (op.op) {
        case 'del':
            if (hasBlob || hasPathEnc)
                return 'bad_request';
            return null;
        case 'add':
        case 'mod': {
            if (!hasPathEnc)
                return 'bad_request';
            if (op.folder) {
                if (hasBlob || hasSize)
                    return 'bad_request';
            }
            else {
                if (!hasBlob || !hasSize)
                    return 'bad_request';
                const sizeCode = checkContentSize(op.size);
                if (sizeCode)
                    return sizeCode;
            }
            return null;
        }
        case 'move': {
            if (!hasPathEnc || !hasPrev)
                return 'bad_request';
            if (op.folder) {
                if (hasBlob || hasSize)
                    return 'bad_request';
            }
            else {
                if (!hasBlob || !hasSize)
                    return 'bad_request';
                const sizeCode = checkContentSize(op.size);
                if (sizeCode)
                    return sizeCode;
            }
            return null;
        }
        default:
            return 'bad_request';
    }
};
/** Espejo de `Batch::validate` — vacío, techo de ops, cada op y firma no vacía. */
export const validateBatch = (batch) => {
    if (batch.ops.length === 0)
        return 'bad_request';
    if (batch.ops.length > MAX_BATCH_OPS)
        return 'bad_request';
    for (const op of batch.ops) {
        const code = validateBatchOp(op);
        if (code)
            return code;
        if (typeof op.sig !== 'string' || op.sig.length === 0)
            return 'bad_request';
    }
    return null;
};
//# sourceMappingURL=messages.js.map