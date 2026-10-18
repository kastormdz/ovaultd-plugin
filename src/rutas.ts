import type { App } from 'obsidian';

/** id del plugin: es también el nombre de su carpeta dentro de `plugins/`. */
export const ID_PLUGIN = 'ovaultd';

/**
 * Carpeta del plugin a partir del `configDir` del vault.
 *
 * El `configDir` NO es siempre `.obsidian`: el usuario puede cambiarlo (perfiles, sync de
 * la config, etc.). Todas las rutas internas del plugin se derivan de acá; hardcodear
 * `.obsidian` deja el estado, la sesión y el log en una carpeta que no es la del vault.
 */
export function carpetaDelPlugin(configDir: string): string {
  return `${configDir}/plugins/${ID_PLUGIN}`;
}

/** Igual que `carpetaDelPlugin`, para los módulos que ya tienen el `App`. */
export function dirDelPlugin(app: App): string {
  return carpetaDelPlugin(app.vault.configDir);
}
