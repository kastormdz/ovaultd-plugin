#!/usr/bin/env node
/**
 * Sincroniza `vendor/@ovaultd/*` con el monorepo.
 *
 * El plugin importa `@ovaultd/{core,crypto,protocol}`. Resolverlos por `file:../ovaultd/…`
 * funciona en desarrollo, pero deja el repo **no construible por sí solo**: quien clona
 * únicamente este repositorio (por ejemplo la verificación de build del directorio de la
 * comunidad de Obsidian) no tiene `../ovaultd` y `npm run build` muere con TS2307.
 *
 * Este script deja el repo autocontenido: copia los paquetes a `vendor/` y el
 * `package.json` apunta ahí. El monorepo sigue siendo la ÚNICA fuente: `vendor/` es un
 * artefacto generado (no se edita a mano) y el workflow de release falla si quedó
 * desactualizado (`git diff --exit-code vendor/` después de correr esto).
 *
 *   node scripts/sincronizar-core.mjs
 *   OVAULTD_MONOREPO=/ruta/al/monorepo node scripts/sincronizar-core.mjs
 *
 * Si el monorepo no está al lado, se clona (build en limpio) y se construyen sus `dist/`.
 */
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const paquetes = ['protocol', 'crypto', 'core'];
const monorepo = process.env.OVAULTD_MONOREPO ?? resolve(raiz, '..', 'ovaultd');
const destino = join(raiz, 'vendor', 'ovaultd');

function correr(comando, args, cwd) {
  console.log(`  $ ${comando} ${args.join(' ')}   (en ${cwd})`);
  execFileSync(comando, args, { cwd, stdio: 'inherit' });
}

// 1) El monorepo tiene que estar. Si no está al lado, se clona (es público).
if (!existsSync(join(monorepo, 'packages', 'core'))) {
  console.log(`ovaultd: el monorepo no está en ${monorepo}: se clona.`);
  if (existsSync(monorepo)) rmSync(monorepo, { recursive: true, force: true });
  correr('git', ['clone', '--depth', '1', 'https://github.com/kastormdz/ovaultd.git', monorepo], raiz);
}

// 2) Los `dist/` son lo que el plugin consume: si faltan, se construyen.
if (!existsSync(join(monorepo, 'packages', 'core', 'dist', 'index.js'))) {
  console.log('ovaultd: faltan los dist del núcleo: se construyen.');
  if (existsSync(join(monorepo, 'node_modules'))) {
    correr('npx', ['tsc', '-b', 'packages/protocol', 'packages/crypto', 'packages/core'], monorepo);
  } else {
    correr('npm', ['ci'], monorepo);
    correr('npm', ['run', 'build'], monorepo);
  }
}

// 3) Copia: package.json + fuentes + dist (y la licencia si el paquete la trae).
rmSync(destino, { recursive: true, force: true });
const versiones = {};
for (const paquete of paquetes) {
  const origen = join(monorepo, 'packages', paquete);
  const copia = join(destino, paquete);
  mkdirSync(copia, { recursive: true });
  cpSync(join(origen, 'package.json'), join(copia, 'package.json'));
  cpSync(join(origen, 'src'), join(copia, 'src'), { recursive: true });
  cpSync(join(origen, 'dist'), join(copia, 'dist'), { recursive: true });
  for (const extra of ['LICENSE', 'README.md']) {
    if (existsSync(join(origen, extra))) cpSync(join(origen, extra), join(copia, extra));
  }
  versiones[paquete] = JSON.parse(readFileSync(join(origen, 'package.json'), 'utf8')).version;
}

// 4) Aviso para quien abra la carpeta por curiosidad.
mkdirSync(join(raiz, 'vendor'), { recursive: true });
writeFileSync(
  join(raiz, 'vendor', 'README.md'),
  `# vendor (generado)\n\n` +
    `Copia de \`@ovaultd/{${paquetes.join(',')}}\` sacada del monorepo la última vez que se\n` +
    `sincronizó. **No editar a mano**: los cambios van al monorepo y se traen con\n` +
    `\`node scripts/sincronizar-core.mjs\`. El workflow de release verifica que esté al día.\n`,
  'utf8',
);

console.log(`ovaultd: vendor sincronizado → vendor/ovaultd/{${paquetes.join(',')}}`);
for (const [paquete, version] of Object.entries(versiones)) {
  console.log(`  @ovaultd/${paquete} ${version}`);
}
