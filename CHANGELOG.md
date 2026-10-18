# Changelog

Todos los cambios relevantes del plugin, por corte de release.
El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y el versionado es
[semver](https://semver.org/lang/es/): el plugin viaja en un **release train** con el server
(mismo `MAJOR.MINOR` = pareja probada junta; ver ADR-0018 y la sección «Compatibility» del
README).

## [0.2.8] — 2026-10-18

### Fixed

- **El motor se recupera solo de un corte de conexión.** Si el WebSocket se cerraba (el server lo
  cierra al rechazar una operación, o se cae la red), el objeto de la conexión seguía existiendo
  y el ciclo lo reutilizaba: cada intento fallaba con `SyncConnection: sin conexión abierta` y el
  motor quedaba muerto hasta recargar el plugin. Ahora el ciclo pide una conexión **viva** y la
  reabre si hace falta, retomando desde el checkpoint.

## [0.2.7] — 2026-10-18

### Fixed

- **El índice local ahora es por vault.** IndexedDB es por ORIGEN de la app, no por vault, y el
  nombre de la base era fijo: dos vaults del mismo Obsidian compartían el índice. Al vincular un
  vault nuevo, el motor encolaba con el `expectedRev` del vault anterior y el servidor rechazaba
  por conflicto (`rev 23, head 0`): el vault recién vinculado no subía nada y encima mostraba
  "al día". Ahora la base lleva el uuid del vault, y el desvínculo borra la suya (capturando el
  uuid antes de borrar el estado).

## [0.2.6] — 2026-10-18

### Fixed

- **Un archivo vacío ya no rompe la sincronización.** El contenido de un archivo de 0 bytes se
  codifica como cadena vacía, y el outbox lo comparaba por truthiness: lo tomaba por "sin
  contenido", lanzaba un error y **abortaba el ciclo completo**. En un vault real con 188 notas
  más un `.md` en blanco, el servidor quedaba con 0 revisiones y el motor repetía el mismo error
  en cada ciclo; el archivo vacío tampoco materializaba su snapshot. Las tres comparaciones van
  ahora contra `null`/`undefined`, y hay tests que cubren el caso.

## [0.2.5] — 2026-10-18

### Added

- **El plugin ya se puede instalar en móvil** (Android e iOS). `isDesktopOnly` estaba en
  `true` sin necesidad: la única pieza atada al escritorio es el export/import al sistema de
  archivos, que ya estaba guardada por `Platform.isDesktopApp` y en móvil avisa y no hace nada.
  Verificado antes de sacarlo: el bundle no tiene un solo `require('node:*)`, las dependencias
  vendorizadas no tocan Node, no hay lookbehind en expresiones regulares y `indexedDB` ya estaba
  guardado.

### Fixed

- La barra de estado se pinta a través de un helper que tolera su ausencia: `addStatusBarItem()`
  está documentado como no disponible en móvil, así que el elemento puede ser `null` y ahora el
  plugin no depende de él (el estado sigue visible en los ajustes).

## [0.2.4] — 2026-10-18

### Fixed

- **`minAppVersion` pasa de 1.5.0 a 1.8.7**, que es la versión que introduce `messageEl`
  (el API que reemplaza al `noticeEl` deprecado): mientras el mínimo era 1.5.0 el revisor lo
  marcaba como error por usar un API más nuevo que el declarado. Es el recorte mínimo
  posible: `setDestructive` y el API declarativo de ajustes son de 1.13.0 y no se usan.
- Los timers del resolver y del registro de eventos pasan por la ventana del renderer: eran
  los últimos `globalThis` fuera del helper `src/entorno.ts` (que conserva el fallback a
  `globalThis` porque los tests corren en node).

## [0.2.3] — 2026-10-18

### Fixed

- **El repositorio ahora se construye solo.** El núcleo (`@ovaultd/{core,crypto,protocol}`)
  vive en `vendor/` (copia generada y verificada en CI) en vez de resolverse por
  `file:../ovaultd/…`: quien clonaba únicamente este repositorio —como la verificación de
  build del directorio de la comunidad— no podía compilar (TS2307 en cada import del núcleo).
- El `README` se titula con el nombre del manifest (`oVaultd Sync`), como pide el directorio.
- Los timers del adaptador de archivos usan la ventana del renderer (los últimos `globalThis`).

### Added

- `scripts/sincronizar-core.mjs`: trae el núcleo del monorepo a `vendor/` (clonándolo si hace
  falta). El workflow de release falla si `vendor/` quedó desactualizado.

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
