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
export declare const BLOB_ENVELOPE_BYTES: number;
/** Parámetros Argon2id versionados. */
export interface KdfParams {
    m_kib: number;
    t: number;
    p: number;
    dk_len: number;
}
/** Parámetros Argon2id oficiales de `sync2`. */
export declare const KDF_DEFAULTS: KdfParams;
/** Subclaves derivadas por HKDF-SHA-256. */
export interface SubKeys {
    content: Uint8Array;
    nonce: Uint8Array;
    path: Uint8Array;
    meta: Uint8Array;
    bind: Uint8Array;
    /** Seed de la identidad Ed25519 del vault. */
    sign: Uint8Array;
}
/** Identidad Ed25519 determinista del vault. */
export interface VaultIdentity {
    seed: Uint8Array;
    pubkey: Uint8Array;
}
/** Códigos de error del esquema (los `ErrorCode` del wire son otra cosa). */
export type Sync2ErrorCode = 'wrong_password' | 'authentication_failed' | 'invalid_length' | 'invalid_kdf_params' | 'invalid_argument';
export declare class Sync2Error extends Error {
    readonly code: Sync2ErrorCode;
    constructor(code: Sync2ErrorCode, message: string);
}
/** Deriva la KEK desde la password (NFKC adentro, como el Rust). */
export declare const deriveKek: (password: string, salt: Uint8Array, params?: KdfParams) => Uint8Array;
/** Deriva la KEK de recovery desde el secreto de recuperación (HKDF, no Argon2). */
export declare const deriveKekRecovery: (recoverySecret: Uint8Array, salt: Uint8Array) => Uint8Array;
/**
 * AAD de `wrapped_key_pw`. Los parámetros son SIEMPRE los defaults de sync2:
 * el Rust los hardcodea en `wrap_pw`/`unwrap_pw` (no usa los de derivación).
 */
export declare const vaultkeyPwAad: (vaultId: Uint8Array, salt: Uint8Array) => Uint8Array;
/** AAD de `wrapped_key_rc`: dominio ‖ vault_id(16). */
export declare const vaultkeyRcAad: (vaultId: Uint8Array) => Uint8Array;
/** `wrapped_key_pw` = `nonce[24] ‖ seal(kek, nonce, aadPw, vault_key)`. */
export declare const wrapKeyPw: (vaultKey: Uint8Array, kek: Uint8Array, vaultId: Uint8Array, salt: Uint8Array) => Uint8Array;
/** Desenvuelve `wrapped_key_pw`; error `wrong_password` si el AEAD no autentica. */
export declare const unwrapKeyPw: (wrapped: Uint8Array, kek: Uint8Array, vaultId: Uint8Array, salt: Uint8Array) => Uint8Array;
/** Variante con nonce explícito (vectores dorados: el nonce está fijado). */
export declare const unwrapPwWithNonce: (kek: Uint8Array, vaultId: Uint8Array, salt: Uint8Array, nonce: Uint8Array, ciphertext: Uint8Array) => Uint8Array;
/** `wrapped_key_rc` = `nonce[24] ‖ seal(kek_recovery, nonce, aadRc, vault_key)`. */
export declare const wrapKeyRc: (vaultKey: Uint8Array, kekRecovery: Uint8Array, vaultId: Uint8Array) => Uint8Array;
/** Desenvuelve `wrapped_key_rc`. */
export declare const unwrapKeyRc: (wrapped: Uint8Array, kekRecovery: Uint8Array, vaultId: Uint8Array) => Uint8Array;
/** Variante con nonce explícito (vectores dorados). */
export declare const unwrapRcWithNonce: (kekRecovery: Uint8Array, vaultId: Uint8Array, nonce: Uint8Array, ciphertext: Uint8Array) => Uint8Array;
/** Deriva las seis subclaves: `HKDF(vault_key, salt, "sync2/<label>")`. */
export declare const deriveSubkeys: (vaultKey: Uint8Array, salt: Uint8Array) => SubKeys;
/** Identidad determinista del vault desde su seed (`k_sign`). */
export declare const identityFromSeed: (seed: Uint8Array) => VaultIdentity;
/** Identidad determinista del vault desde las subclaves. */
export declare const identityFromSubkeys: (keys: SubKeys) => VaultIdentity;
/** `nonce_body = HMAC-SHA256(k_nonce, plaintext)[0..24]` — MLE keyed (dedupe intra-vault). */
export declare const nonceBody: (keys: SubKeys, plaintext: Uint8Array) => Uint8Array;
/**
 * Cifra contenido: devuelve el blob **almacenado** `nonce[24] ‖ ciphertext ‖ tag[16]`.
 * El nonce es determinista: mismo plaintext ⇒ mismo blob ⇒ mismo `blob_id` (dedupe).
 */
export declare const encryptBlob: (keys: SubKeys, plaintext: Uint8Array) => Uint8Array;
/** Descifra un blob almacenado: el nonce sale del prefijo (el camino del lector). */
export declare const decryptBlob: (keys: SubKeys, stored: Uint8Array) => Uint8Array;
/** Descifra un blob *bare* (`ciphertext ‖ tag`) con nonce explícito (vectores). */
export declare const decryptBlobWithNonce: (keys: SubKeys, nonce: Uint8Array, ciphertext: Uint8Array) => Uint8Array;
/** `blob_id = SHA-256(blob almacenado)` — la clave del CAS. */
export declare const blobId: (blob: Uint8Array) => Uint8Array;
/** `path_id = HMAC-SHA256(k_path, NFKC(path))`. */
export declare const pathId: (keys: SubKeys, path: string) => Uint8Array;
/** `path_enc = nonce[24] ‖ seal(k_path, nonce, aad=path_id, NFKC(path))`. */
export declare const pathEnc: (keys: SubKeys, path: string) => Uint8Array;
/**
 * Descifra un `path_enc` almacenado. El lector NO conoce el path en claro: el
 * nonce sale del prefijo y el AAD es el `path_id` que viaja en el registro.
 */
export declare const decryptPathEnc: (keys: SubKeys, stored: Uint8Array, expectedPathId: Uint8Array) => string;
/** Variante con nonce explícito (vectores dorados: el nonce está fijado). */
export declare const decryptPathEncWithNonce: (keys: SubKeys, nonce: Uint8Array, expectedPathId: Uint8Array, ciphertext: Uint8Array) => string;
/** `T = sign("sync2/bind" ‖ vault_id(16) ‖ path_id(32) ‖ blob_id(32) ‖ u16be(epoch))`. */
export declare const tMac: (identity: VaultIdentity, vaultUid: Uint8Array, pathIdValue: Uint8Array, blobIdValue: Uint8Array, epoch: number) => Uint8Array;
/** Bytes canónicos de un registro del oplog (`msg_rec`). */
export declare const msgRec: (pathIdValue: Uint8Array, blobIdValue: Uint8Array, tMacValue: Uint8Array, opCode: number, size: number | bigint, mtime: number | bigint, expectedRev: number | bigint, operationId: Uint8Array, epoch: number) => Uint8Array;
/** Firma un registro del oplog. */
export declare const signRecord: (identity: VaultIdentity, pathIdValue: Uint8Array, blobIdValue: Uint8Array, tMacValue: Uint8Array, opCode: number, size: number | bigint, mtime: number | bigint, expectedRev: number | bigint, operationId: Uint8Array, epoch: number) => Uint8Array;
/** Verifica la firma de un registro del oplog. */
export declare const verifyRecord: (publicKey: Uint8Array, pathIdValue: Uint8Array, blobIdValue: Uint8Array, tMacValue: Uint8Array, opCode: number, size: number | bigint, mtime: number | bigint, expectedRev: number | bigint, operationId: Uint8Array, epoch: number, signature: Uint8Array) => boolean;
/** Bytes canónicos de una prueba de posesión: `challenge ‖ u64be(vault) ‖ u64be(device)`. */
export declare const proofMsg: (vaultDbId: number | bigint, deviceId: number | bigint, challenge: Uint8Array) => Uint8Array;
/** Firma una prueba de posesión (`POST /access` y `auth` del WS). */
export declare const signProof: (identity: VaultIdentity, vaultDbId: number | bigint, deviceId: number | bigint, challenge: Uint8Array) => Uint8Array;
/** Verifica una prueba de posesión contra la clave pública del vault. */
export declare const verifyProof: (publicKey: Uint8Array, vaultDbId: number | bigint, deviceId: number | bigint, challenge: Uint8Array, proof: Uint8Array) => boolean;
export declare const randomVaultKey: () => Uint8Array;
export declare const randomSalt: () => Uint8Array;
export declare const randomRecoverySecret: () => Uint8Array;
/** 16 B de azar para el `operation_id` (se escribe como UUID en el batch). */
export declare const randomOperationId: () => Uint8Array;
/** 16 B de azar para el `vault_id` del cliente (ADR-0013). */
export declare const randomVaultUuid: () => Uint8Array;
/** Formatea 16 B como UUID textual (la forma que el commit tolera en el batch). */
export declare const bytesToUuid: (bytes: Uint8Array) => string;
//# sourceMappingURL=sync2.d.ts.map