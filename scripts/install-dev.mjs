// install:dev — copia el build (main.js, manifest.json, styles.css) al plugin dir de
// un vault de Obsidian, para probar contra Obsidian REAL.
//
//   npm run install:dev -- --vault "$HOME/tmp/ovaultd-device-a"
//
// La ruta tiene que ser un vault (contener .obsidian/). Nada más se toca.
import { cpSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const argumentos = process.argv.slice(2);
const indice = argumentos.indexOf('--vault');
const vault = indice >= 0 ? argumentos[indice + 1] : undefined;

if (vault === undefined || vault === '') {
  console.error('uso: npm run install:dev -- --vault <ruta del vault>');
  process.exit(2);
}

const vaultAbs = resolve(vault);
if (!existsSync(join(vaultAbs, '.obsidian'))) {
  console.error(`no parece un vault de Obsidian (falta .obsidian/): ${vaultAbs}`);
  process.exit(2);
}

const destino = join(vaultAbs, '.obsidian', 'plugins', 'ovaultd');
mkdirSync(destino, { recursive: true });

for (const archivo of ['main.js', 'manifest.json', 'styles.css']) {
  const origen = join(raiz, archivo);
  if (existsSync(origen)) {
    cpSync(origen, join(destino, archivo));
  }
}

console.log(`plugin instalado en ${destino}`);
