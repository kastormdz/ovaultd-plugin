# Changelog

Todos los cambios relevantes del plugin, por corte de release.
El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y el versionado es
[semver](https://semver.org/lang/es/): el plugin viaja en un **release train** con el server
(mismo `MAJOR.MINOR` = pareja probada junta; ver ADR-0018 y la sección «Compatibility» del
README).

## [0.2.26] — 2026-10-19

### Fixed

- **Se terminan las colisiones de config entre dispositivos**: `appearance.json`,
  `core-plugins.json`, `hotkeys.json` y los manifests de plugins de terceros dejan de
  sincronizarse. Obsidian los reescribe solo y cada dispositivo los tiene distinto (en
  producción `appearance.json` acumuló 25 revisiones entre 3 equipos y, como un conflicto
  aborta el ciclo, frenaba la sincronización de las notas). Siguen viajando `themes/*` y
  `snippets/*`: el CSS es contenido.
- Al actualizar, el tema activo y los atajos se eligen una vez por dispositivo.

## [0.2.25] — 2026-10-19

### Changed

- **Núcleo sincronizado (transacciones por lote)**: `confirmarLote` y `putOutboxMany`
  escriben base + índice + outbox + checkpoint del lote en UNA transacción de IndexedDB
  (antes 4 por nota) y los lotes suben hasta 1000 ops. En el CLI el T1 bajó de 63,8 s a
  **37,1 s**; en Obsidian el efecto es menor pero los lotes grandes también aplican.

## [0.2.24] — 2026-10-19

### Changed

- **Núcleo sincronizado (rendimiento del push)**: el escaneo reusa los bytes que ya leyó
  (sin un `read` extra por archivo), los PUT van en tandas de 16 (no 50 en vuelo) y los
  lotes suben a 250 ops porque el commit tiene un costo fijo por lote. `confirmar` sin
  `getIndex` redundante y checkpoint una vez por lote. En Obsidian el efecto es menor
  (el `read` es local), pero los lotes y el checkpoint también aplican.

## [0.2.23] — 2026-10-19

### Changed

- **Núcleo sincronizado**: `readMany` en el puerto de archivos (el escaneo del CLI lee en
  tandas; en el plugin el `read` es local y el bucle sigue igual), `fetchImpl` inyectable
  en `SyncConnection` y el puente binario del CLI. Sin cambios de comportamiento en
  Obsidian.

## [0.2.22] — 2026-10-19

### Changed

- **Escaneo con `statMany`**: el adapter del plugin expone el stat masivo y el escaneo pide
  los stats del vault en una sola tanda (en el CLI, un request al puente en vez de uno por
  archivo). Bench: el ciclo en reposo y el delta de un cambio bajaron de 3,4 s a ~1,8 s
  medidos con el CLI — **el ciclo neto quedó en ~0,3 s** (lo demás es el arranque de
  Chromium del CLI, que el plugin no paga).

## [0.2.21] — 2026-10-19

### Changed

- **Subidas agrupadas y escaneo incremental** (núcleo 0.2.20): el push manda lotes de hasta
  50 operaciones en un solo commit (UNA revisión por lote) con los PUT de blobs en paralelo,
  y el escaneo reusa el hash del índice cuando mtime+size no cambiaron. En un vault de 1000
  notas / 100 MB: la subida inicial baja de 99 a 72 s, el ciclo en reposo de 8,6 a 3,4 s y
  el delta de un cambio de 8,7 a 3,4 s (bench del 2026-10-19, `docs/benchmarks.md`).

## [0.2.20] — 2026-10-19

### Added

- **Modos de sincronización por dispositivo** (plan fase 3, paso 5): Ajustes → «Modo de
  este dispositivo»:
  - **Normal**: sube y baja (el comportamiento de siempre).
  - **Solo bajar** (`pull-only`): nunca publica operaciones — tampoco copias de conflicto.
    Ideal para un equipo de consulta.
  - **Espejo del servidor** (`mirror-remote`): el servidor manda; el pull pisa lo local y
    lo descartado se resguarda en `.ovaultd-descartes/<sello>/` (vetado del sync: nunca
    vuelve al servidor).

### Fixed

- **Un cliente sin archivos locales ya no borra el vault remoto**: sin un solo archivo en
  disco (vault recién creado, disco sin montar, scan a medias) los «borrados» del diff no
  se encolan y el report lo expone como `deletesBloqueados`. Es el caso que destapó el
  bench (1000 borrados subidos por un cliente que heredó un checkpoint ajeno).

## [0.2.19] — 2026-10-19

### Fixed

- **En Android el nombre del device pasa a ser el MODELO del equipo** (`SM-S918B`,
  `Pixel 8`, …): el user-agent del WebView lo incluye y distingue dos teléfonos entre sí.
  El fallback «Obsidian móvil» quedaba genérico para todos los móviles (el mismo problema
  del literal «obsidian», en miniatura). En iOS el UA no expone el modelo: queda la familia
  («iPhone»/«iPad»). Nuevos tests unitarios de `identidadDelDispositivo` con UA reales.

## [0.2.18] — 2026-10-19

### Fixed

- **El dispositivo se presenta con el hostname de la máquina**
  (`entorno.ts::identidadDelDispositivo`): antes el registro mandaba `name` y `platform` =
  `"obsidian"` para todos, y el panel del server listaba filas idénticas imposibles de
  distinguir. Ahora viaja el hostname real (`yavin`, `juno`, …) y la plataforma del SO; en
  móvil, donde no hay `require`, queda un nombre fijo distinguible («Obsidian móvil»). El
  `require` sigue siendo dinámico: el bundle móvil no ve imports estáticos de node.

## [0.2.17] — 2026-10-18

### Fixed

- **Fusión 3-vías: una inserción pegada al borde de un reemplazo ajeno ya no fusiona
  artefactos.** El caso que cazó el corpus del núcleo: un lado edita `1` → `uno` y el otro
  `1` → `1.0`; la fusión producía `uno.0` — un texto que nadie escribió. Ahora el borde
  derecho INTERNO de un reemplazo cuenta como solapamiento (conflicto: se conservan ambas
  versiones); el fin del documento sigue siendo adyacencia válida (reemplazo total +
  agregado al final fusiona, como siempre). El vendor trae la misma corrección del núcleo.

## [0.2.16] — 2026-10-18

### Changed

- **`community-plugins.json` y el manifest del propio plugin dejan de sincronizarse.** La
  lista de plugins habilitados depende de qué plugins están INSTALADOS en cada dispositivo:
  sincronizarla solo traía conflictos de bajo valor (cada toggle la reescribe y el orden
  cambia). El manifest propio tampoco viaja: su versión la mueve la tienda en cada
  dispositivo — el sincronizado hacía que un dispositivo «mintiera» su versión. Lo demás de
  la config portable sigue igual: `appearance.json`, `themes/*`, `snippets/*`, `hotkeys.json`,
  `core-plugins.json` y los manifests de plugins de terceros.

## [0.2.15] — 2026-10-18

### Added

- **Historia por archivo**: «Ver historia de esta nota…» y «Ver historia de un archivo (por
  ruta)…» (paleta de comandos y Opciones): cada revisión con su operación, fecha,
  dispositivo y tamaño; funciona también para archivos BORRADOS y nombres anteriores a un
  renombre.
- **Preview y restore**: elegís una revisión y ves el diff contra el archivo actual (o el
  contenido completo si no existe) ANTES de tocar nada; restaurar escribe esa versión en el
  vault y el motor la sube como revisión NUEVA (la historia jamás se reescribe).

### Changed

- El núcleo vendorizado sube a la API de historia (requiere server 0.2.5+ del train):
  `conexionParaExport` pasa a llamarse `conexionAlVuelo` (la usan el export y la historia).

### Fixed

- **Un arranque fallido ya no deja el motor muerto**: si el primer arranque no puede
  conectarse (red caída al abrir, server reiniciando), el motor reprograma el arranque solo
  cada 30 s — antes quedaba en «error» hasta apagar y prender el plugin a mano (el timer de
  rescate recién existe con el motor ya arrancado). `detener()` cancela el reintento.

## [0.2.14] — 2026-10-18

### Fixed

- **Los temas (y toda la config portable) ahora cruzan entre dispositivos.** El escaneo del
  vault salta las carpetas excluidas enteras —no baja a ellas— y la raíz del `configDir`
  (`.obsidian`) quedaba excluida porque no matchea ningún patrón de la lista blanca: el motor
  nunca leía adentro, así que `themes/`, `snippets/` y los `manifest.json` de plugins jamás se
  subían. Ahora los contenedores del `configDir` (la raíz, `snippets`/`themes`/`plugins` y
  `plugins/<id>`) se recursan y sus archivos se deciden uno a uno: los portables viajan y los
  vetados (`data.json` de cualquier plugin, `workspace.json`, estado de sesión) siguen afuera.
  Con esto, cambiar el tema en un dispositivo llega al otro.

## [0.2.13] — 2026-10-18

### Added

- **Los conflictos de texto se fusionan solos cuando no se pisan.** Si dos dispositivos editan
  la misma nota pero en partes distintas (cada cambio en su párrafo o en su línea), el motor
  combina las dos ediciones automáticamente y sube el resultado como una revisión nueva. Si las
  ediciones tocan el mismo tramo, queda el conflicto explícito de siempre.
- La fusión se calcula 100 % local (el server no ve nada) y es conservadora: cualquier
  solapamiento o duda es conflicto, nunca una adivinanza. Tu versión local jamás se pisa sola.

## [0.2.12] — 2026-10-18

### Fixed

- **La nota abierta ya no "desaparece" cuando llega un cambio desde otro dispositivo.** Al
  aplicar una revisión sobre un archivo existente, el motor ahora escribe el contenido nuevo
  ENCIMA (un modify común) en lugar de borrarlo y recrearlo. Obsidian veía ese borrado como
  "el archivo se fue" y desvinculaba la pestaña abierta: la nota se cerraba y había que volver
  a buscarla, como si fuera una nota nueva con el mismo nombre. Con esto la vista abierta se
  refresca en vivo, igual que con el cliente oficial.

## [0.2.11] — 2026-10-18

### Added

- **La configuración portátil de Obsidian ahora se sincroniza.** El tema, los snippets, los atajos
  y qué plugins tenés habilitados viajan al otro dispositivo; antes la carpeta de configuración
  quedaba afuera entera. Es una lista blanca explícita: `appearance.json`, `community-plugins.json`,
  `core-plugins.json`, `hotkeys.json`, `snippets/`, `themes/` y los `manifest.json` de los plugins.

### Nota

- **No** se sincronizan los `data.json` de los plugins (ni el de ovaultd), el estado de sesión ni
  los layouts por dispositivo: pueden contener credenciales de otros servicios, y esto viaja a
  todos tus dispositivos y queda en tu servidor.

## [0.2.10] — 2026-10-18

### Added

- **Los cambios del otro dispositivo llegan solos.** Cuando alguien commitea en el mismo vault, el
  server avisa a las demás conexiones y el motor adelanta el ciclo en vez de esperar al próximo
  cambio local: antes, con Obsidian abierto, la bajada quedaba pendiente hasta que algo local
  disparara un ciclo. El aviso es una señal —el ciclo que dispara es el de siempre, un pull con el
  `since` del checkpoint— así que un aviso perdido no pierde ningún dato. Requiere el server 0.2.1
  o posterior (el que emite el aviso).
- **Rescate cada 30 s.** Un ciclo periódico como red de seguridad: en el teléfono el WebSocket se
  duerme con la app en segundo plano y ahí el aviso no llega. No es el mecanismo principal, es el
  piso: sin avisos, dos dispositivos convergen en «a lo sumo 30 segundos».

## [0.2.9] — 2026-10-18

### Fixed

- **Aplicar un cambio sobre un archivo que ya existe rompía el ciclo.** El motor escribe a un
  temporal y lo renombra (escritura atómica). El `rename` de POSIX pisa el destino, pero el del
  adapter de Obsidian **no**: lanza `Destination file already exists`. Como el `NodeFileAdapter`
  del CLI sí pisa, la diferencia pasó desapercibida mientras los clientes solo subían (con el
  servidor vacío). Al sincronizar un segundo dispositivo, aplicar sus revisiones sobre archivos
  ya presentes fallaba en todos los ciclos y el vault no bajaba nada. Ahora el adapter borra el
  destino antes de renombrar, y el mock de los tests es fiel al adapter real (antes no fallaba,
  por eso el caso no estaba cubierto).

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
