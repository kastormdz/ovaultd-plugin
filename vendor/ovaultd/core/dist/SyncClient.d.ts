/**
 * SyncClient — el orquestador del ciclo de convergencia (fase 3, paso 3).
 *
 * La tabla de decisión del plan, contra la base:
 *  - local ≠ base y remoto = base  → **push** (lo maneja el drenado de la outbox).
 *  - remoto ≠ base y local = base  → **pull** (apply; el guard de tercera versión decide).
 *  - ambos = base                  → **convergencia** (no pasa nada).
 *  - ambos ≠ base                  → **conflicto EXPLÍCITO**: el pull deja la revisión
 *    `blocked` con el motivo y el ciclo lo reporta. Resolverlo (merge conservador o
 *    copia) es el corte del merge; hasta entonces, un conflicto se VE, no se adivina.
 *
 * Orden del ciclo: **pull → push** (plan §4.2). El pull deja la base al día y el push
 * rebasea contra el head actual. Si el pull quedó `blocked` o pidió `resync`, el ciclo
 * NO pushea: el checkpoint quedó atrás de una revisión sin aplicar y el CAS rechazaría
 * todo lo nuestro — mejor UN conflicto visible que N conflicts ruidosos. Los cambios
 * locales esperan en la outbox (save-first): nada se pierde.
 */
import type { FileSystemPort } from './file-port.js';
import { type PushReport } from './push.js';
import { type PullReport } from './reconcile.js';
import type { SyncConnection } from './SyncConnection.js';
import type { StateStore } from './StateStore.js';
import type { SubKeys } from '@ovaultd/crypto';
/**
 * Cómo participa este dispositivo del vault (plan fase 3, paso 5):
 *  - `normal`: pull → push (el comportamiento de siempre).
 *  - `pull-only`: SOLO baja; jamás publica operaciones — tampoco copias de conflicto.
 *  - `mirror-remote`: el server manda. Igual que pull-only no publica; el pull pisa lo
 *    local a propósito y lo descartado se resguarda en `.ovaultd-descartes/` (vetado por
 *    el filtro: nunca se sube).
 */
export type ModoDeSync = 'normal' | 'pull-only' | 'mirror-remote';
export interface SyncCycleDeps {
    store: StateStore;
    port: FileSystemPort;
    keys: SubKeys;
    conn: SyncConnection;
    /** `vault_id` de 16 B del material (el que firma), no el numérico del server. */
    vaultUuid: Uint8Array;
    epoch: number;
    /**
     * Cómo participa este dispositivo (default `normal`). `pull-only` jamás publica: el
     * pull deja el estado local al día y lo que no vino del server se queda acá.
     */
    modo?: ModoDeSync;
}
export interface ConflictoDeSync {
    tipo: 'pull-bloqueado' | 'push-conflicto' | 'resync';
    pathId?: string;
    rev?: number;
    mensaje: string;
}
export interface SyncCycleReport {
    /** `convergido` = sin conflictos (haya habido cambios o no). */
    estado: 'convergido' | 'con-conflictos' | 'resync-requerido';
    pull: PullReport;
    /** `null` cuando el ciclo no llegó a pushear (pull bloqueado o resync). */
    push: PushReport | null;
    conflictos: ConflictoDeSync[];
}
/** Una pasada completa: pull y (si se puede) push. No reconecta: eso es de `retry`. */
export declare function correrCiclo(deps: SyncCycleDeps): Promise<SyncCycleReport>;
//# sourceMappingURL=SyncClient.d.ts.map