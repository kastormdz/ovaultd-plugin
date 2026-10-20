# Spike de eventos del vault: medición real (fase 3, corte 2)

**Fecha:** 2026-10-17 · **Obsidian:** 1.14.4 (Electron 43, Wayland, Linux/inotify) · **Vault:** de prueba, arrancado en frío · **Instrumentación:** `src/spikeEventos.ts` del plugin (crudos + coalescidos + sondas de estabilidad + conteo del configDir) · **Estímulos:** `docs/spike/estimulos.sh` (12 grupos, marcas de tiempo en ms, ejecutados por SSH) · **Ventana del coalescer medida:** 250 ms.

El plan de fase 3 lo pedía explícito: *"cómo coalescen `vault.on(...)` en uso real no está medido — es lo primero que mide el spike"*. Esto es esa medición, con el váter de datos que trajo.

## Método

1. El plugin instalado en un vault de prueba con el spike auto-activo (marcador `spike.activo`), registrando cada evento crudo con timestamp de ms, cada cambio coalescido emitido, y una **sonda de estabilidad** por cada create/modify: relee el archivo a +0/+80/+300 ms y anota tamaño + sha256 corto.
2. Doce grupos de estímulos por SSH (creates, ráfaga de appends cada 150 ms, guardado atómico estilo editor, deletes, renames, carpetas, archivo de 1 MiB, transitorio de 200 ms, touch, temporal del motor), cada grupo flanqueado por marcas de tiempo contra las que se cruza el JSONL.
3. Los datos crudos quedaron en `spike.jsonl` del vault de pruebas (96 líneas); acá va el análisis.

## Resultados por grupo

| # | Estímulo | Crudos | Emitidos | Lectura |
|---|---|---|---|---|
| 1 | create simple (+ carpeta) | 2 | 2 a +250 ms | debounce básico ✓ |
| 2 | ráfaga: 5 appends cada 150 ms | 5 modify (a +1…605 ms) | **1** a +855 ms | **el debounce extiende la ventana y colapsa** ✓ |
| 3 | guardado atómico (tmp visible + `mv` sobre existente) | 3: create(tmp), modify(dest), delete(tmp) | **1**: modify(dest) | el par create+delete del tmp **se cancela** ✓ |
| 4 | delete de archivo | 1 | 1 | latencia ≈100 ms (ver abajo) |
| 5 | `mv` externo (rename por shell) | create(nuevo), delete(viejo) | created + deleted | **NO existe evento `rename` para operaciones externas** |
| 6 | carpeta nueva + archivo adentro | 2 | 2 | ✓ |
| 7 | `mv` externo de CARPETA con contenido | 4: create(dir, hijo), delete(hijo, dir) | 4 | los hijos se emiten **por archivo**, no como subtree |
| 8 | delete de carpeta con contenido | 2 (hijo, dir) | 2 | hijo primero, carpeta después |
| 9 | archivo de 1 MiB | 2: create + modify | **1** | create+modify colapsa ✓ |
| 10 | transitorio: create + rm a los 200 ms | 2 | 2 (created, deleted) | **no cancela**; ver hallazgo 9 |
| 11 | `touch` (mtime sin contenido) | 1 modify | 1 | ✓ |
| 12 | temporal `.ovaultd-tmp-…` (dotfile) | **0** | 0 | **los dotfiles no generan eventos** |

## Hallazgos (y su implicancia para el motor)

1. **El contenido está estable cuando llega el evento.** En las 7 series de sondas, el hash a +0 ms es idéntico al de +80 y +300 ms (incluido el 1 MiB y la ráfaga). Leer el archivo apenas llega el evento da el contenido final, sin carreras de escritura parcial, para estos escritores.
2. **El debounce de 250 ms funciona tal cual se diseñó**: una ráfaga de 5 modificados separados por 150 ms produjo UN solo cambio emitido, a 250 ms del último. La ventana se queda como está.
3. **Los renames externos (por fuera de Obsidian) NO llegan como `rename`**: el watcher emite `created(nuevo)` + `deleted(viejo)`, sin `oldPath`. El evento `rename` con `oldPath` solo existe para operaciones hechas **por la API del vault** (plug-in, editor). El motor trata `del`+`add` como caso de primera clase (ya era la decisión del plan: "sin rename heurístico: del+add, correcto siempre").
4. **Guardado atómico externo** (escribir `.tmp` visible + `mv` sobre el existente): se ve como `modify(destino)` + `create(tmp)` + `delete(tmp)`. La fusión conservadora del puente cancela el par del temporal (create+delete en ventana → neto nada) y emite **un** cambio útil. Los temporales con nombre no-dot igual ensucian la ventana: los del motor (`.ovaultd-tmp-*`) no aparecen (ver 7).
5. **Latencia del watcher**: creates/modifies ≈ 0–10 ms; **deletes y renames externos ≈ 100–110 ms** (consistente en los cuatro grupos que borran). Un `rm` real a los 9 ms aparece como evento a los ~110 ms.
6. **Rename de carpeta externo**: se emite por archivo: `create` de cada hijo nuevo + `delete` de cada hijo viejo + las carpetas. Nada de subtree mágico; el orden observado pone los **creates antes que los deletes**.
7. **Dotfiles invisibles al watcher**: el temporal `.ovaultd-tmp-…` creado y borrado dentro de una carpeta normal generó **cero** eventos. El filtro `esTemporal` del puente queda como defensa en profundidad (y para móvil, donde el adapter no es inotify); la primera línea es que el watcher ni los ve.
8. **`.obsidian/` (configDir) no emite eventos**: el spike escribió su log decenas de veces ahí y nunca se vio a sí mismo (contador de auto-eventos: 0). Consecuencia doble: (a) el log del plugin y `data.json` no generan ruido; (b) la sincronización selectiva de configuración (plan §7.2.1) **no** puede depender de eventos: será por scan explícito.
9. **Transitorio lento no cancela**: create + `rm` a los 200 ms reales produjo DOS emitidos, porque el `delete` llegó recién a los ~300 ms (latencia del punto 5) y el `create` ya había salido de la ventana. Ningún coalescer local puede arreglar eso sin latencia artificial: **el motor trabaja con eventos como PISTAS; la verdad es el scan por hash** (un create+delete real converge a "nada" en la comparación).
10. **`requestUrl` vs `fetch`**: (pendiente del checklist manual, no medido en este spike).

## Decisiones que quedan firmes con esta evidencia

- **Ventana de estabilidad: 250 ms.** Colapsa ráfagas reales sin latencia perceptible para el motor.
- **Fusión conservadora del puente**: sin cambios (los tres casos medidos, burst, atómico y transitorio, dieron el resultado esperado salvo el transitorio lento, que es inevitable y benigno).
- **Anti-loop por hash esperado**: se queda, aunque en desktop sea redundante para dotfiles; el caso real que lo usa es el `rename` del publish (que SÍ emite evento, porque va por la API), y móvil está sin medir.
- **El motor no asume orden ni completitud de eventos**: scan por hash como fuente de verdad; eventos como wake-up.

## Limitaciones de esta medición

- Un vault, una corrida, un Linux con inotify: móvil y macOS quedan para el checklist de dos dispositivos.
- Los escritores fueron shell (no el editor de Obsidian): los guardados internos del editor llegan por la API (rename real incluido); eso se cubre en el checklist manual con la UI real.
- `requestUrl`/CORS del plugin real: se validó `fetch` desde el shell del plugin (corte 1), no desde la UI en segundo plano.

## Reproducir

```bash
# con el plugin instalado y el spike activo (marcador junto al plugin):
OVAULTD_SPIKE_VAULT="$HOME/tmp/ovaultd-device-a" bash docs/spike/estimulos.sh
# el log del spike queda en el vault; cruzar los timestamps contra $HOME/tmp/ovaultd-stim.log
```
