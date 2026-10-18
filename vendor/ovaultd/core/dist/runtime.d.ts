/**
 * Entrada del runtime: este archivo se bundlea a `dist/runtime.js` (IIFE) y se
 * carga DENTRO de la página de Chromium. Expone `globalThis.ovaultdRuntime.dispatch`,
 * el único punto de entrada del puente JSON Node↔runtime.
 *
 * El protocolo del puente es estable desde el día uno:
 *   request : { id: number, method: string, params?: unknown }
 *   response: { id, ok: true, result } | { id, ok: false, error: { message, name? } }
 *
 * Corte 1: runtime + StateStore. Corte 2: outbox save-first (enqueue determinista con
 * snapshot verificado) y journal de aplicación (begin/verify/complete atómico). Corte 3:
 * orquestación real de `apply` contra el filesystem (puente confinado al vault) y
 * recuperación de intenciones al reiniciar. Corte 4: `SyncConnection` (WS+HTTP contra el
 * wire, commit solo por WS) y `pullOnce` (convergencia). Corte 5: `pushOnce` (save-first →
 * cifrar → firmar → batch por WS) y `correrCiclo` — la tabla de decisión pull→push con
 * conflictos explícitos (SyncClient).
 */
export declare const RUNTIME_VERSION = "0.5.0";
//# sourceMappingURL=runtime.d.ts.map