#!/usr/bin/env bash
# Estímulos para el spike de eventos de ovaultd (corte 2, fase 3).
# Cada grupo va separado por ~2.5 s de silencio y queda marcado (ms epoch) en el log
# local, para cruzar después contra spike.jsonl del plugin (ver docs/spike-eventos.md).
#
#   OVAULTD_SPIKE_VAULT="$HOME/tmp/ovaultd-device-a" bash estimulos.sh
#   # opcional: OVAULTD_SPIKE_LOG="$HOME/tmp/ovaultd-stim.log"
set -euo pipefail

V="${OVAULTD_SPIKE_VAULT:?definí OVAULTD_SPIKE_VAULT con la ruta del vault de pruebas}"
L="${OVAULTD_SPIKE_LOG:-$HOME/tmp/ovaultd-stim.log}"
marca() { printf '%s %s\n' "$(date +%s%3N)" "$1" >> "$L"; }

: > "$L"
mkdir -p "$V/Notas" "$V/Carpeta"

marca "1-create: start"
printf 'contenido inicial\n' > "$V/Notas/est-creado.md"
marca "1-create: fin"
sleep 3

marca "2-burst: start"
for i in 1 2 3 4 5; do printf "linea %s\n" "$i" >> "$V/Notas/est-creado.md"; sleep 0.15; done
marca "2-burst: fin"
sleep 3

marca "3-atomico: start"
printf 'contenido del guardado atomico\n' > "$V/Notas/est-creado.md.tmp-escritura"
mv "$V/Notas/est-creado.md.tmp-escritura" "$V/Notas/est-creado.md"
marca "3-atomico: fin"
sleep 3

marca "4-delete: start"
rm "$V/Notas/est-creado.md"
marca "4-delete: fin"
sleep 3

marca "5-rename: start"
printf 'para renombrar\n' > "$V/Notas/est-renombrar.md"
sleep 1
mv "$V/Notas/est-renombrar.md" "$V/Notas/est-renombrado.md"
marca "5-rename: fin"
sleep 3

marca "6-carpeta-nueva: start"
mkdir "$V/Carpeta/Nueva"
printf 'adentro\n' > "$V/Carpeta/Nueva/adentro.md"
marca "6-carpeta-nueva: fin"
sleep 3

marca "7-rename-dir: start"
mv "$V/Carpeta/Nueva" "$V/Carpeta/Movida"
marca "7-rename-dir: fin"
sleep 3

marca "8-delete-dir: start"
rm -r "$V/Carpeta/Movida"
marca "8-delete-dir: fin"
sleep 3

marca "9-grande: start"
head -c 1048576 /dev/urandom | base64 > "$V/Notas/est-grande.md"
marca "9-grande: fin"
sleep 3

marca "10-transitorio: start"
printf 'efimero\n' > "$V/Notas/est-efimero.md"
sleep 0.2
rm "$V/Notas/est-efimero.md"
marca "10-transitorio: fin"
sleep 3

marca "11-touch: start"
touch "$V/Notas/est-renombrado.md"
marca "11-touch: fin"
sleep 3

marca "12-temp-propio: start"
printf 'temporal del motor\n' > "$V/Notas/.ovaultd-tmp-abc1234567890def"
sleep 0.5
rm "$V/Notas/.ovaultd-tmp-abc1234567890def"
marca "12-temp-propio: fin"
sleep 3

marca "FIN"
echo "estímulos completos; log local: $L"
