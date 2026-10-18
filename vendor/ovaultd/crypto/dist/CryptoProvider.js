/**
 * `CryptoProvider` — la superficie criptográfica que `sync2` necesita.
 *
 * Todo el paquete pasa por acá: cambiar de implementación (noble hoy; WASM/WebCrypto
 * mañana para el móvil) no toca una línea del esquema. La implementación por defecto
 * (`nobleCryptoProvider`) usa @noble con las MISMAS versiones que el spike de interop.
 */
import { xchacha20poly1305 } from '@noble/ciphers/chacha.js';
import { ed25519 } from '@noble/curves/ed25519.js';
import { argon2id } from '@noble/hashes/argon2.js';
import { hkdf } from '@noble/hashes/hkdf.js';
import { hmac } from '@noble/hashes/hmac.js';
import { sha256 } from '@noble/hashes/sha2.js';
/**
 * Implementación por defecto: @noble, versiones fijadas a las del spike verificado
 * (`spikes/crypto-interop/js`). El azar sale de WebCrypto (`crypto.getRandomValues`),
 * disponible tanto en Node ≥ 19 como en el navegador.
 */
export const nobleCryptoProvider = {
    randomBytes(length) {
        const out = new Uint8Array(length);
        globalThis.crypto.getRandomValues(out);
        return out;
    },
    sha256(data) {
        return sha256(data);
    },
    hmacSha256(key, data) {
        return hmac(sha256, key, data);
    },
    hkdfSha256(ikm, salt, info, length) {
        return hkdf(sha256, ikm, salt, info, length);
    },
    argon2id(password, salt, params) {
        return argon2id(password, salt, {
            m: params.m_kib,
            t: params.t,
            p: params.p,
            dkLen: params.dk_len,
        });
    },
    xchachaSeal(key, nonce, aad, message) {
        return xchacha20poly1305(key, nonce, aad).encrypt(message);
    },
    xchachaOpen(key, nonce, aad, ciphertext) {
        return xchacha20poly1305(key, nonce, aad).decrypt(ciphertext);
    },
    ed25519PublicKey(seed) {
        return ed25519.getPublicKey(seed);
    },
    ed25519Sign(seed, message) {
        return ed25519.sign(message, seed);
    },
    ed25519Verify(publicKey, message, signature) {
        return ed25519.verify(signature, message, publicKey);
    },
};
let activo = nobleCryptoProvider;
/** El proveedor activo (noble por defecto). */
export const cryptoProvider = () => activo;
/**
 * Reemplaza el proveedor activo (WASM/móvil, o un doble de test).
 * El esquema `sync2` no cambia: solo cambia quién ejecuta las primitivas.
 */
export const setCryptoProvider = (provider) => {
    activo = provider;
};
//# sourceMappingURL=CryptoProvider.js.map