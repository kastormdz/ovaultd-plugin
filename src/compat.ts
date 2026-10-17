/**
 * Compatibilidad server ↔ plugin (ADR-0018).
 *
 * Reglas del contrato:
 *  - **Release train**: mismo `MAJOR.MINOR` en server y plugin = pareja probada junta.
 *  - El plugin PIDE `/api/v1/meta` antes de vincular y al conectar; si su versión es menor
 *    que `min_plugin_version`, no toca nada (el server no es el culpable: el plugin es viejo).
 *  - Si el plugin tiene un `MINOR` mayor que el server, se avisa suave: puede haber
 *    funciones que el server todavía no tenga.
 *  - El wire (`sync2`, `v2`) es aparte: si el server habla otro wire, no hay nada que hacer.
 *
 * Todo lo de este archivo es PURO (sin `obsidian`, sin red): se testea directo.
 */

export const NOMBRE_CLIENTE = 'oVaultd-plugin';

/** El wire que ESTE plugin sabe hablar (ADR-0018: es del formato, no del release train). */
export const WIRE_ESPERADO = 'v2';

/** Header con el que todo cliente se identifica (logs y diagnóstico del server). */
export function cabeceraCliente(version: string): Record<string, string> {
  return { 'x-ovaultd-client': `${NOMBRE_CLIENTE}/${version}` };
}

/** Forma de `GET /api/v1/meta` que este plugin consume. */
export interface MetaDelServer {
  server_version: string;
  api: string;
  wire_protocol: string;
  min_plugin_version: string;
  features: string[];
}

export interface Veredicto {
  /** `false` = no hay que tocar nada (ni vincular ni sincronizar). */
  ok: boolean;
  /** Motivo del bloqueo, ya listo para mostrar. `null` si no hay bloqueo. */
  bloqueo: string | null;
  /** Advertencia suave (se puede seguir). `null` si no hay nada que avisar. */
  aviso: string | null;
  features: string[];
}

/** Compara dos versiones semver por número (no por texto: `0.10.0` > `0.9.0`). */
export function comparar(a: string, b: string): number {
  const limpio = (x: number | undefined): number =>
    x !== undefined && Number.isFinite(x) ? x : 0;
  const pa = a.split('.').map((x) => Number.parseInt(x, 10));
  const pb = b.split('.').map((x) => Number.parseInt(x, 10));
  for (let i = 0; i < Math.max(pa.length, pb.length); i += 1) {
    const na = limpio(pa[i]);
    const nb = limpio(pb[i]);
    if (na !== nb) return na < nb ? -1 : 1;
  }
  return 0;
}

/** `MAJOR.MINOR` de una versión: la unidad del release train. */
export function tren(version: string): string {
  return version.split('.').slice(0, 2).join('.');
}

/**
 * Decide si este plugin puede trabajar contra ese server. No lanza: devuelve el veredicto
 * con el mensaje ya redactado, para que quien llame lo muestre tal cual (la UI no arma textos).
 */
export function evaluarCompatibilidad(versionPropia: string, meta: MetaDelServer): Veredicto {
  const features = Array.isArray(meta.features) ? meta.features : [];

  if (meta.wire_protocol !== WIRE_ESPERADO) {
    return {
      ok: false,
      bloqueo: `El server habla el wire ${meta.wire_protocol} y este plugin el ${WIRE_ESPERADO}. Son incompatibles: actualizá el que quedó viejo.`,
      aviso: null,
      features,
    };
  }

  if (comparar(versionPropia, meta.min_plugin_version) < 0) {
    return {
      ok: false,
      bloqueo: `El server pide ${NOMBRE_CLIENTE} ${meta.min_plugin_version} o superior, y este plugin es ${versionPropia}. Actualizá el plugin y volvé a intentar.`,
      aviso: null,
      features,
    };
  }

  if (comparar(tren(versionPropia), tren(meta.server_version)) > 0) {
    return {
      ok: true,
      bloqueo: null,
      aviso: `El server es ${meta.server_version} y este plugin ${versionPropia}: puede haber funciones que el server todavía no tenga.`,
      features,
    };
  }

  return { ok: true, bloqueo: null, aviso: null, features };
}
