/**
 * SyncFilter — qué NO es contenido sincronizable (plan fase 3, paso 5; versión del
 * corte del motor).
 *
 * Es POLÍTICA ÚNICA del núcleo: el CLI y el plugin excluyen exactamente lo mismo, y el
 * escaneo la aplica en un solo lugar (`escanearVault`). Dos reglas de oro:
 *
 *  - **Excluir NO significa borrar el remoto**: si un path excluido ya estuviera en la
 *    base, el diff no propone su `del`. La exclusión empieza "hacia adelante".
 *  - La lista BLANCA selectiva de configuración portable (`.obsidian` con appearance,
 *    snippets, themes, plugins/ * /manifest|data) NO vive acá todavía: llega en el corte
 *    de filtros, porque primero hay que decidir qué hacer con `data.json` de plugins de
 *    terceros (puede contener credenciales de otros servicios) — no se sincroniza "porque sí".
 */
/** ¿Por qué este path NO se sincroniza? `null` = es contenido. */
export declare function motivoDeExclusion(path: string): string | null;
/** Atajo booleano para los llamadores que no muestran el motivo. */
export declare const estaExcluido: (path: string) => boolean;
//# sourceMappingURL=SyncFilter.d.ts.map