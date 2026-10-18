# Development

Building the plugin, the vendored core, and the rules for changes that touch sync. Nothing here is
needed to *use* the plugin — this is the contributor's path, kept out of the README on purpose.

## Build

```bash
npm install
npm run dev            # esbuild in watch mode → main.js
npm run build          # typecheck (tsc -noEmit) + production build (with the anti-Node gate)
npm test               # vitest: wire conformance, engine, adapter, vault creation
```

`npm run build` also runs the **anti-Node gate**: the bundle must not gain a single `node:*` import,
because the same `main.js` runs on mobile. `isDesktopOnly` is deliberately not set.

## The vendored core

The plugin imports `@ovaultd/{core,crypto,protocol}` from `vendor/`, a **generated copy** of the
monorepo's packages, so this repository builds on its own (clone it, `npm install`, `npm run build`
— no sibling checkout needed). To pull the current core in:

```bash
node scripts/sincronizar-core.mjs   # clones the monorepo if it is not next to this one
```

Never edit `vendor/` by hand: changes go to the monorepo and come in through that script. The
release workflow re-runs it and fails if the copy is stale, so a published plugin can never ship a
different core than the one it was tested with.

## Testing sync for real

Sync is the risky part, so the loop for changes that touch it: build, copy to a real vault, and
watch `motor.log` and the status bar — the engine is designed to be observed. `docs/spike-eventos.md`
is a measured report on how Obsidian's watcher actually behaves (external renames arrive as
create+delete, dotfiles emit no events, content is stable by the time the event lands); those
measurements are what the engine is built on.

Unit tests do not find the bugs that matter here. A vault with a real file tree (empty files,
subdirectories) and a **second device** are what surface them — three of the first real bugs came
from exactly that, not from the happy path.

## Leak gate

Before every push: `scripts/scan-leaks.sh` (plus `.githooks/pre-commit`, activated with
`git config core.hooksPath .githooks`). Personal patterns go in `scripts/leaks.local` (never
versioned).
