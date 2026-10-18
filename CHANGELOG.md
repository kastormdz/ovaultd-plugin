# Changelog

Todos los cambios relevantes del plugin, por corte de release.
El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y el versionado es
[semver](https://semver.org/lang/es/): el plugin viaja en un **release train** con el server
(mismo `MAJOR.MINOR` = pareja probada junta; ver ADR-0018 y la sección «Compatibility» del
README).

## [0.2.2] — 2026-10-18

Correcciones que salieron de la revisión automática del directorio de la comunidad.

### Fixed

- **El `configDir` del vault es configurable** y las rutas internas ahora se derivan de él
  (estado local, sesión, log y los pedidos E2E sin UI). Antes asumían `.obsidian`: en un vault
  con la configuración en otra carpeta, el plugin escribía su estado donde no correspondía.
- Los títulos de las secciones de ajustes usan `setHeading()` del API, no elementos HTML.
- Los avisos de progreso usan `messageEl` en vez del `noticeEl` deprecado.
- Timers y listeners usan la ventana del renderer (con caída a `globalThis` fuera de
  Obsidian) para convivir con las ventanas emergentes.

## [0.2.1] — 2026-10-18

### Fixed

- El nombre del manifest pasa a **oVaultd Sync**: el directorio de la comunidad no admite la
  palabra «Plugin» en el nombre (es redundante ahí). Sin cambios de comportamiento.

## [0.2.0] — 2026-10-17

Primera release publicada del plugin: sync por eventos, conflictos explícitos y gestión
completa de vaults desde los ajustes.

### Added

- **Compatibilidad declarada con el server** (ADR-0018): el plugin consulta
  `GET /api/v1/meta` antes de vincular y de crear un vault, y al arrancar el motor. Si el
  server pide un plugin más nuevo, se niega a tocar nada con un mensaje que apunta al plugin;
  si va un tren adelante, avisa sin bloquear. Todo pedido se identifica con
  `x-ovaultd-client: oVaultd-plugin/<version>`.
- **«Probar conexión»** ahora reporta el veredicto de compatibilidad, no solo que el server
  responde.
- **Gestión de vaults desde los ajustes**: crear un vault nuevo, vincular uno existente,
  desvincular la carpeta, borrar un vault (confirmando el nombre), recuperar el acceso con la
  recovery key y cambiar la password del vault.
- **Sesión de cuenta única**: servidor, email y password de la cuenta se piden una vez y
  sobreviven al desvínculo; la lista de vaults de la cuenta se consulta desde ahí.
- **Export / import**: escribir el vault remoto en una carpeta local, o importar una carpeta
  al vault, con validación previa a escribir nada.
- **Resolución explícita de conflictos**: cuando el mismo archivo cambió en dos dispositivos,
  el plugin reporta el conflicto y pide elegir (versión local o del server); ninguna edición
  se pisa sin decisión.

### Changed

- Sincronización **por evento** (coalescida y con debounce, bajo lock), con estado durable en
  IndexedDB, outbox save-first y journal de aplicación.
- Estado y logs locales acotados (`estado-local.json`, `sesion-cuenta.json`, `motor.log`);
  ninguna password se persiste.
- El bundle es **mobile-grade por construcción**: la compilación falla si se filtra un builtin
  de Node, así el mismo `main.js` corre donde Node no existe.

### Fixed

- Soltar el vínculo también borra el índice durable: un vault nuevo sobre la misma carpeta ya
  no queda «sin cambios» comparando contra la base vieja.
- Los formularios conservan lo escrito cuando el guardado falla.

[0.2.0]: https://github.com/kastormdz/ovaultd-plugin/releases/tag/plugin-v0.2.0
