#!/usr/bin/env bash
# Preflight de release del plugin (ADR-0018 + requisitos del directorio de Obsidian).
#
#   bash scripts/preflight-release.sh 0.2.0
#
# El tag ES la versión, SIN prefijo: el directorio de la comunidad descarga los assets del
# release cuyo tag coincide exactamente con el `version` del manifest.
#
# Falla si el tag no tiene la forma `X.Y.Z`, si `manifest.json` o `package.json` no declaran
# esa versión, o si `versions.json` no tiene la entrada de esta versión (es el archivo con el
# que la tienda sabe qué versión mínima de la app necesita cada versión del plugin).
set -euo pipefail

tag="${1:?uso: bash scripts/preflight-release.sh X.Y.Z}"
raiz="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if ! printf '%s' "$tag" | grep -Eq '^[0-9]+\.[0-9]+\.[0-9]+$'; then
  echo "✗ el tag tiene que ser X.Y.Z (sin prefijo): recibí '$tag'" >&2
  exit 1
fi

del_manifest="$(grep -m1 '"version"' "$raiz/manifest.json" | cut -d'"' -f4)"
del_package="$(grep -m1 '"version"' "$raiz/package.json" | cut -d'"' -f4)"

if [ "$del_manifest" != "$tag" ]; then
  echo "✗ el tag dice $tag y manifest.json dice $del_manifest" >&2
  exit 1
fi

if [ "$del_package" != "$tag" ]; then
  echo "✗ el tag dice $tag y package.json dice $del_package" >&2
  exit 1
fi

# versions.json: la entrada de esta versión tiene que existir y apuntar al minAppVersion
# declarado en el manifest (si no, la tienda no sabe con qué app se puede instalar).
min_app="$(grep -m1 '"minAppVersion"' "$raiz/manifest.json" | cut -d'"' -f4)"
if ! grep -A1 "\"$tag\"" "$raiz/versions.json" | grep -q "$min_app"; then
  echo "✗ versions.json no mapea $tag a minAppVersion ($min_app): agregá \"$tag\": \"$min_app\"" >&2
  exit 1
fi

echo "✓ $tag: tag, manifest.json, package.json y versions.json coinciden"
