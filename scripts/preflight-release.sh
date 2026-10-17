#!/usr/bin/env bash
# Preflight de release del plugin (ADR-0018): el tag ES la versión declarada.
#
#   bash scripts/preflight-release.sh plugin-v0.2.0
#
# Falla si el tag no tiene la forma `plugin-vX.Y.Z`, o si `manifest.json` y `package.json`
# no declaran esa misma versión. La versión que ve Obsidian es la del manifest: si el tag
# y el manifest se separan, la release publica un plugin que miente sobre sí mismo.
set -euo pipefail

tag="${1:?uso: bash scripts/preflight-release.sh plugin-vX.Y.Z}"
raiz="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

case "$tag" in
  plugin-v*) esperado="${tag#plugin-v}" ;;
  *)
    echo "✗ el tag tiene que ser plugin-vX.Y.Z (recibí: $tag)" >&2
    exit 1
    ;;
esac

if ! printf '%s' "$esperado" | grep -Eq '^[0-9]+\.[0-9]+\.[0-9]+$'; then
  echo "✗ '$esperado' no es una versión X.Y.Z" >&2
  exit 1
fi

del_manifest="$(grep -m1 '"version"' "$raiz/manifest.json" | cut -d'"' -f4)"
del_package="$(grep -m1 '"version"' "$raiz/package.json" | cut -d'"' -f4)"

if [ "$del_manifest" != "$esperado" ]; then
  echo "✗ el tag dice $esperado y manifest.json dice $del_manifest" >&2
  exit 1
fi

if [ "$del_package" != "$esperado" ]; then
  echo "✗ el tag dice $esperado y package.json dice $del_package" >&2
  exit 1
fi

echo "✓ plugin-v$esperado: tag, manifest.json y package.json coinciden"
