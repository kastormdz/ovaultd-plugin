/**
 * SyncFilter — qué NO es contenido sincronizable (plan fase 3, paso 5; versión del
 * corte del motor, con la lista blanca de configuración portable).
 *
 * Es POLÍTICA ÚNICA del núcleo: el CLI y el plugin excluyen exactamente lo mismo, y el
 * escaneo la aplica en un solo lugar (`escanearVault`). Tres reglas de oro:
 *
 *  - **Excluir NO significa borrar el remoto**: si un path excluido ya estuviera en la
 *    base, el diff no propone su `del`. La exclusión empieza "hacia adelante".
 *  - **De `configDir` sólo se sincroniza la lista blanca de abajo.** El resto de la
 *    configuración (los `data.json` de los plugins, los workspaces, los logs) se queda
 *    local: esto viaja a TODOS los dispositivos y queda en un servidor ajeno a los
 *    servicios que esas credenciales usan. No se sincroniza "porque sí".
 *  - **Los `workspace*.json` son por dispositivo**: sincronizarlos desordena los paneles
 *    del otro lado.
 */
/** ¿Este path relativo dentro de `configDir` es configuración portable? */
export declare function esConfigPortable(dentroDelConfig: string): boolean;
/**
 * ¿Por qué este path NO se sincroniza? `null` = es contenido.
 *
 * `configDir` es el del vault (no siempre `.obsidian`): el usuario puede cambiarlo.
 */
export declare function motivoDeExclusion(path: string, configDir?: string): string | null;
/** Atajo booleano para los llamadores que no muestran el motivo. */
export declare const estaExcluido: (path: string, configDir?: string) => boolean;
//# sourceMappingURL=SyncFilter.d.ts.map