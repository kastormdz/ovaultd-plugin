/**
 * `sync2` en TypeScript — port byte-fiel de la implementación de referencia.
 *
 * Fuentes de verdad, en este orden:
 *  1. `spikes/crypto-interop/js/spike.mjs` (interop Rust↔JS verificada byte a byte),
 *  2. `crates/ovaultd-crypto` (comportamiento del server y del smoke),
 *  3. `tests/fixtures/crypto/sync2.json` (los 32 vectores congelados).
 *
 * Layouts (implementation-map § 6):
 * - Envolturas y `path_enc`: `nonce[24] ‖ ciphertext ‖ tag[16]` (nonce aleatorio).
 * - Blob de contenido: igual, con `nonce = nonce_body` (determinista ⇒ dedupe intacto)
 *   — ADR-0014: el nonce viaja adentro porque el lector no puede derivarlo.
 * - `AAD de wrapped_key_pw`: `"sync2/vaultkey/pw" ‖ vault_id(16) ‖ salt(16) ‖ u32be(m) ‖
 *   u32be(t) ‖ u32be(p) ‖ u32be(dkLen)` con los DEFAULT de sync2, siempre — el Rust
 *   también los hardcodea así en `wrap_pw`/`unwrap_pw`.
 */
import { cryptoProvider } from './CryptoProvider.js';
// ---------------------------------------------------------------------------
// Constantes y tipos
// ---------------------------------------------------------------------------
const DOMAIN = 'sync2';
const NONCE_LEN = 24;
const TAG_LEN = 16;
const U8 = 0xff;
export const BLOB_ENVELOPE_BYTES = NONCE_LEN + TAG_LEN;
/** Parámetros Argon2id oficiales de `sync2`. */
export const KDF_DEFAULTS = { m_kib: 65_536, t: 3, p: 4, dk_len: 32 };
export class Sync2Error extends Error {
    code;
    constructor(code, message) {
        super(message);
        this.name = 'Sync2Error';
        this.code = code;
    }
}
// ---------------------------------------------------------------------------
// Bytes helpers (locales: este paquete no depende de nadie)
// ---------------------------------------------------------------------------
const concat = (...parts) => {
    let total = 0;
    for (const part of parts)
        total += part.length;
    const out = new Uint8Array(total);
    let offset = 0;
    for (const part of parts) {
        out.set(part, offset);
        offset += part.length;
    }
    return out;
};
const u8 = (value) => Uint8Array.of(value & U8);
const u16be = (value) => {
    const out = new Uint8Array(2);
    new DataView(out.buffer).setUint16(0, value, false);
    return out;
};
const u32be = (value) => {
    const out = new Uint8Array(4);
    new DataView(out.buffer).setUint32(0, value, false);
    return out;
};
const u64be = (value) => {
    const out = new Uint8Array(8);
    new DataView(out.buffer).setBigUint64(0, BigInt(value), false);
    return out;
};
const text = new TextEncoder();
const nfkc = (value) => value.normalize('NFKC');
const asArgon = (params) => ({
    m_kib: params.m_kib,
    t: params.t,
    p: params.p,
    dk_len: params.dk_len,
});
const hkdf32 = (ikm, salt, label) => cryptoProvider().hkdfSha256(ikm, salt, text.encode(`${DOMAIN}/${label}`), 32);
const splitEnvelope = (stored, what) => {
    if (stored.length < NONCE_LEN + TAG_LEN) {
        throw new Sync2Error('invalid_length', `${what}: sobre demasiado corto`);
    }
    return [stored.subarray(0, NONCE_LEN), stored.subarray(NONCE_LEN)];
};
// ---------------------------------------------------------------------------
// KDF y envolturas de la vault_key
// ---------------------------------------------------------------------------
/** Deriva la KEK desde la password (NFKC adentro, como el Rust). */
export const deriveKek = (password, salt, params = KDF_DEFAULTS) => {
    if (params.dk_len !== 32 || params.m_kib === 0 || params.t === 0 || params.p === 0) {
        throw new Sync2Error('invalid_kdf_params', 'parámetros Argon2id inválidos');
    }
    return cryptoProvider().argon2id(text.encode(nfkc(password)), salt, asArgon(params));
};
/** Deriva la KEK de recovery desde el secreto de recuperación (HKDF, no Argon2). */
export const deriveKekRecovery = (recoverySecret, salt) => cryptoProvider().hkdfSha256(recoverySecret, salt, text.encode(`${DOMAIN}/kek-recovery`), 32);
/**
 * AAD de `wrapped_key_pw`. Los parámetros son SIEMPRE los defaults de sync2:
 * el Rust los hardcodea en `wrap_pw`/`unwrap_pw` (no usa los de derivación).
 */
export const vaultkeyPwAad = (vaultId, salt) => concat(text.encode(`${DOMAIN}/vaultkey/pw`), vaultId, salt, u32be(KDF_DEFAULTS.m_kib), u32be(KDF_DEFAULTS.t), u32be(KDF_DEFAULTS.p), u32be(KDF_DEFAULTS.dk_len));
/** AAD de `wrapped_key_rc`: dominio ‖ vault_id(16). */
export const vaultkeyRcAad = (vaultId) => concat(text.encode(`${DOMAIN}/vaultkey/rc`), vaultId);
/** `wrapped_key_pw` = `nonce[24] ‖ seal(kek, nonce, aadPw, vault_key)`. */
export const wrapKeyPw = (vaultKey, kek, vaultId, salt) => {
    const nonce = cryptoProvider().randomBytes(NONCE_LEN);
    const ciphertext = cryptoProvider().xchachaSeal(kek, nonce, vaultkeyPwAad(vaultId, salt), vaultKey);
    return concat(nonce, ciphertext);
};
const expectKey = (plaintext, what) => {
    if (plaintext.length !== 32) {
        throw new Sync2Error('invalid_length', `${what}: la vault_key desenvuelta no tiene 32 B`);
    }
    return plaintext;
};
/** Desenvuelve `wrapped_key_pw`; error `wrong_password` si el AEAD no autentica. */
export const unwrapKeyPw = (wrapped, kek, vaultId, salt) => {
    const [nonce, ciphertext] = splitEnvelope(wrapped, 'wrapped_key_pw');
    try {
        return expectKey(cryptoProvider().xchachaOpen(kek, nonce, vaultkeyPwAad(vaultId, salt), ciphertext), 'wrapped_key_pw');
    }
    catch (error) {
        if (error instanceof Sync2Error)
            throw error;
        throw new Sync2Error('wrong_password', 'password incorrecta');
    }
};
/** Variante con nonce explícito (vectores dorados: el nonce está fijado). */
export const unwrapPwWithNonce = (kek, vaultId, salt, nonce, ciphertext) => {
    try {
        return expectKey(cryptoProvider().xchachaOpen(kek, nonce, vaultkeyPwAad(vaultId, salt), ciphertext), 'wrapped_key_pw');
    }
    catch (error) {
        if (error instanceof Sync2Error)
            throw error;
        throw new Sync2Error('wrong_password', 'password incorrecta');
    }
};
/** `wrapped_key_rc` = `nonce[24] ‖ seal(kek_recovery, nonce, aadRc, vault_key)`. */
export const wrapKeyRc = (vaultKey, kekRecovery, vaultId) => {
    const nonce = cryptoProvider().randomBytes(NONCE_LEN);
    const ciphertext = cryptoProvider().xchachaSeal(kekRecovery, nonce, vaultkeyRcAad(vaultId), vaultKey);
    return concat(nonce, ciphertext);
};
/** Desenvuelve `wrapped_key_rc`. */
export const unwrapKeyRc = (wrapped, kekRecovery, vaultId) => {
    const [nonce, ciphertext] = splitEnvelope(wrapped, 'wrapped_key_rc');
    try {
        return expectKey(cryptoProvider().xchachaOpen(kekRecovery, nonce, vaultkeyRcAad(vaultId), ciphertext), 'wrapped_key_rc');
    }
    catch (error) {
        if (error instanceof Sync2Error)
            throw error;
        throw new Sync2Error('authentication_failed', 'recovery key incorrecta');
    }
};
/** Variante con nonce explícito (vectores dorados). */
export const unwrapRcWithNonce = (kekRecovery, vaultId, nonce, ciphertext) => {
    try {
        return expectKey(cryptoProvider().xchachaOpen(kekRecovery, nonce, vaultkeyRcAad(vaultId), ciphertext), 'wrapped_key_rc');
    }
    catch (error) {
        if (error instanceof Sync2Error)
            throw error;
        throw new Sync2Error('authentication_failed', 'recovery key incorrecta');
    }
};
// ---------------------------------------------------------------------------
// Subclaves e identidad
// ---------------------------------------------------------------------------
/** Deriva las seis subclaves: `HKDF(vault_key, salt, "sync2/<label>")`. */
export const deriveSubkeys = (vaultKey, salt) => ({
    content: hkdf32(vaultKey, salt, 'content'),
    nonce: hkdf32(vaultKey, salt, 'nonce'),
    path: hkdf32(vaultKey, salt, 'path'),
    meta: hkdf32(vaultKey, salt, 'meta'),
    bind: hkdf32(vaultKey, salt, 'bind'),
    sign: hkdf32(vaultKey, salt, 'sign'),
});
/** Identidad determinista del vault desde su seed (`k_sign`). */
export const identityFromSeed = (seed) => ({
    seed,
    pubkey: cryptoProvider().ed25519PublicKey(seed),
});
/** Identidad determinista del vault desde las subclaves. */
export const identityFromSubkeys = (keys) => identityFromSeed(keys.sign);
// ---------------------------------------------------------------------------
// Contenido (blobs) — ADR-0014: el nonce viaja adentro
// ---------------------------------------------------------------------------
/** `nonce_body = HMAC-SHA256(k_nonce, plaintext)[0..24]` — MLE keyed (dedupe intra-vault). */
export const nonceBody = (keys, plaintext) => cryptoProvider().hmacSha256(keys.nonce, plaintext).subarray(0, NONCE_LEN);
/**
 * Cifra contenido: devuelve el blob **almacenado** `nonce[24] ‖ ciphertext ‖ tag[16]`.
 * El nonce es determinista: mismo plaintext ⇒ mismo blob ⇒ mismo `blob_id` (dedupe).
 */
export const encryptBlob = (keys, plaintext) => {
    const nonce = nonceBody(keys, plaintext);
    const ciphertext = cryptoProvider().xchachaSeal(keys.content, nonce, new Uint8Array(0), plaintext);
    return concat(nonce, ciphertext);
};
/** Descifra un blob almacenado: el nonce sale del prefijo (el camino del lector). */
export const decryptBlob = (keys, stored) => {
    const [nonce, ciphertext] = splitEnvelope(stored, 'blob');
    try {
        return cryptoProvider().xchachaOpen(keys.content, nonce, new Uint8Array(0), ciphertext);
    }
    catch {
        throw new Sync2Error('authentication_failed', 'el blob no autentica');
    }
};
/** Descifra un blob *bare* (`ciphertext ‖ tag`) con nonce explícito (vectores). */
export const decryptBlobWithNonce = (keys, nonce, ciphertext) => {
    try {
        return cryptoProvider().xchachaOpen(keys.content, nonce, new Uint8Array(0), ciphertext);
    }
    catch {
        throw new Sync2Error('authentication_failed', 'el blob no autentica');
    }
};
/** `blob_id = SHA-256(blob almacenado)` — la clave del CAS. */
export const blobId = (blob) => cryptoProvider().sha256(blob);
// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------
/** `path_id = HMAC-SHA256(k_path, NFKC(path))`. */
export const pathId = (keys, path) => cryptoProvider().hmacSha256(keys.path, text.encode(nfkc(path)));
/** `path_enc = nonce[24] ‖ seal(k_path, nonce, aad=path_id, NFKC(path))`. */
export const pathEnc = (keys, path) => {
    const normalized = text.encode(nfkc(path));
    const id = cryptoProvider().hmacSha256(keys.path, normalized);
    const nonce = cryptoProvider().randomBytes(NONCE_LEN);
    const ciphertext = cryptoProvider().xchachaSeal(keys.path, nonce, id, normalized);
    return concat(nonce, ciphertext);
};
/**
 * Descifra un `path_enc` almacenado. El lector NO conoce el path en claro: el
 * nonce sale del prefijo y el AAD es el `path_id` que viaja en el registro.
 */
export const decryptPathEnc = (keys, stored, expectedPathId) => {
    const [nonce, ciphertext] = splitEnvelope(stored, 'path_enc');
    return decryptPathEncWithNonce(keys, nonce, expectedPathId, ciphertext);
};
/** Variante con nonce explícito (vectores dorados: el nonce está fijado). */
export const decryptPathEncWithNonce = (keys, nonce, expectedPathId, ciphertext) => {
    try {
        const plaintext = cryptoProvider().xchachaOpen(keys.path, nonce, expectedPathId, ciphertext);
        return new TextDecoder().decode(plaintext);
    }
    catch {
        throw new Sync2Error('authentication_failed', 'el path no autentica');
    }
};
// ---------------------------------------------------------------------------
// Binding y firma
// ---------------------------------------------------------------------------
/** `T = sign("sync2/bind" ‖ vault_id(16) ‖ path_id(32) ‖ blob_id(32) ‖ u16be(epoch))`. */
export const tMac = (identity, vaultUid, pathIdValue, blobIdValue, epoch) => {
    const message = concat(text.encode(`${DOMAIN}/bind`), vaultUid, pathIdValue, blobIdValue, u16be(epoch));
    return cryptoProvider().ed25519Sign(identity.seed, message);
};
/** Bytes canónicos de un registro del oplog (`msg_rec`). */
export const msgRec = (pathIdValue, blobIdValue, tMacValue, opCode, size, mtime, expectedRev, operationId, epoch) => concat(text.encode(`${DOMAIN}/rec`), u8(opCode), pathIdValue, blobIdValue, tMacValue, u64be(size), u64be(mtime), u64be(expectedRev), operationId, u16be(epoch));
/** Firma un registro del oplog. */
export const signRecord = (identity, pathIdValue, blobIdValue, tMacValue, opCode, size, mtime, expectedRev, operationId, epoch) => cryptoProvider().ed25519Sign(identity.seed, msgRec(pathIdValue, blobIdValue, tMacValue, opCode, size, mtime, expectedRev, operationId, epoch));
/** Verifica la firma de un registro del oplog. */
export const verifyRecord = (publicKey, pathIdValue, blobIdValue, tMacValue, opCode, size, mtime, expectedRev, operationId, epoch, signature) => cryptoProvider().ed25519Verify(publicKey, msgRec(pathIdValue, blobIdValue, tMacValue, opCode, size, mtime, expectedRev, operationId, epoch), signature);
/** Bytes canónicos de una prueba de posesión: `challenge ‖ u64be(vault) ‖ u64be(device)`. */
export const proofMsg = (vaultDbId, deviceId, challenge) => concat(challenge, u64be(vaultDbId), u64be(deviceId));
/** Firma una prueba de posesión (`POST /access` y `auth` del WS). */
export const signProof = (identity, vaultDbId, deviceId, challenge) => cryptoProvider().ed25519Sign(identity.seed, proofMsg(vaultDbId, deviceId, challenge));
/** Verifica una prueba de posesión contra la clave pública del vault. */
export const verifyProof = (publicKey, vaultDbId, deviceId, challenge, proof) => cryptoProvider().ed25519Verify(publicKey, proofMsg(vaultDbId, deviceId, challenge), proof);
// ---------------------------------------------------------------------------
// Generadores (azar de producción)
// ---------------------------------------------------------------------------
export const randomVaultKey = () => cryptoProvider().randomBytes(32);
export const randomSalt = () => cryptoProvider().randomBytes(16);
export const randomRecoverySecret = () => cryptoProvider().randomBytes(32);
/** 16 B de azar para el `operation_id` (se escribe como UUID en el batch). */
export const randomOperationId = () => cryptoProvider().randomBytes(16);
/** 16 B de azar para el `vault_id` del cliente (ADR-0013). */
export const randomVaultUuid = () => cryptoProvider().randomBytes(16);
/** Formatea 16 B como UUID textual (la forma que el commit tolera en el batch). */
export const bytesToUuid = (bytes) => {
    if (bytes.length !== 16)
        throw new Sync2Error('invalid_length', 'UUID: se esperan 16 bytes');
    const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};
//# sourceMappingURL=sync2.js.map