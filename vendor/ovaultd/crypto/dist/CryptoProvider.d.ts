/**
 * `CryptoProvider` — la superficie criptográfica que `sync2` necesita.
 *
 * Todo el paquete pasa por acá: cambiar de implementación (noble hoy; WASM/WebCrypto
 * mañana para el móvil) no toca una línea del esquema. La implementación por defecto
 * (`nobleCryptoProvider`) usa @noble con las MISMAS versiones que el spike de interop.
 */
export interface Argon2Params {
    m_kib: number;
    t: number;
    p: number;
    dk_len: number;
}
export interface CryptoProvider {
    randomBytes(length: number): Uint8Array;
    sha256(data: Uint8Array): Uint8Array;
    hmacSha256(key: Uint8Array, data: Uint8Array): Uint8Array;
    hkdfSha256(ikm: Uint8Array, salt: Uint8Array, info: Uint8Array, length: number): Uint8Array;
    argon2id(password: Uint8Array, salt: Uint8Array, params: Argon2Params): Uint8Array;
    xchachaSeal(key: Uint8Array, nonce: Uint8Array, aad: Uint8Array, message: Uint8Array): Uint8Array;
    xchachaOpen(key: Uint8Array, nonce: Uint8Array, aad: Uint8Array, ciphertext: Uint8Array): Uint8Array;
    ed25519PublicKey(seed: Uint8Array): Uint8Array;
    ed25519Sign(seed: Uint8Array, message: Uint8Array): Uint8Array;
    ed25519Verify(publicKey: Uint8Array, message: Uint8Array, signature: Uint8Array): boolean;
}
/**
 * Implementación por defecto: @noble, versiones fijadas a las del spike verificado
 * (`spikes/crypto-interop/js`). El azar sale de WebCrypto (`crypto.getRandomValues`),
 * disponible tanto en Node ≥ 19 como en el navegador.
 */
export declare const nobleCryptoProvider: CryptoProvider;
/** El proveedor activo (noble por defecto). */
export declare const cryptoProvider: () => CryptoProvider;
/**
 * Reemplaza el proveedor activo (WASM/móvil, o un doble de test).
 * El esquema `sync2` no cambia: solo cambia quién ejecuta las primitivas.
 */
export declare const setCryptoProvider: (provider: CryptoProvider) => void;
//# sourceMappingURL=CryptoProvider.d.ts.map