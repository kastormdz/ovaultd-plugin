/**
 * Reintentos con backoff (plan fase 2, paso 4): `2^n × 5 s`, cap 5 min, con jitter, y
 * clasificación de errores: qué se reintenta, qué es fatal y qué pide resync.
 */
export type RetryKind = 'transient' | 'fatal' | 'resync';
export declare const BACKOFF_BASE_MS = 5000;
export declare const BACKOFF_CAP_MS = 300000;
/** Backoff `2^n × 5 s` con cap y jitter (mitad fija, mitad aleatoria). */
export declare function backoffMs(intento: number, random?: () => number): number;
/** Errores con `status`/`code` del wire (los lanza SyncConnection). */
export interface Clasificable {
    status?: number;
    code?: string | null;
}
export declare function clasificarError(error: unknown): RetryKind;
//# sourceMappingURL=retry.d.ts.map