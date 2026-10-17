// Bundle del plugin: `obsidian` y `electron` quedan externos y los módulos de Node
// tienen la PUERTA CERRADA. El mismo bundle corre en Obsidian de escritorio y en
// móvil (donde Node no existe): si un import arrastra `fs`, `path` o cualquier
// builtin, el build FALLA acá y no en el teléfono de alguien.
import esbuild from 'esbuild';
import process from 'node:process';
import { builtinModules } from 'node:module';

const produccion = process.argv[2] === 'production';

/** @type {import('esbuild').Plugin} */
const puertaNode = {
  name: 'puerta-node-builtins',
  setup(build) {
    const vetados = new Set([...builtinModules, ...builtinModules.map((m) => `node:${m}`)]);

    build.onResolve({ filter: /.*/ }, (args) => {
      if (args.kind === 'entry-point' || args.external) {
        return null;
      }

      if (vetados.has(args.path) || args.path.startsWith('node:')) {
        return {
          errors: [
            {
              text: `import de módulo de Node vetado: "${args.path}" — el plugin también corre en móvil`,
            },
          ],
        };
      }

      return null;
    });
  },
};

const contexto = await esbuild.context({
  entryPoints: ['src/main.ts'],
  outfile: 'main.js',
  bundle: true,
  format: 'cjs',
  platform: 'browser',
  target: 'es2022',
  external: ['obsidian', 'electron', '@codemirror/*', '@lezer/*'],
  sourcemap: produccion ? false : 'inline',
  treeShaking: true,
  logLevel: 'info',
  plugins: [puertaNode],
});

if (produccion) {
  await contexto.rebuild();
  process.exit(0);
} else {
  await contexto.watch();
}
