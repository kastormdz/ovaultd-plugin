# ovaultd-plugin

The Obsidian plugin for **ovaultd** — self-hosted, end-to-end encrypted sync for your vault: [github.com/kastormdz/ovaultd](https://github.com/kastormdz/ovaultd).

**Status: under construction** — first cut of phase 3 (the plugin shell: lifecycle, settings, status bar and a real connection check against `/healthz` over CORS). The sync engine (vault adapter, reconciliation table, 3-way merge, conflict UI) lands in the following cuts.

Why a separate repository: the community directory requires the plugin manifest and release assets at the root of the submitted repository, one release per version. The server, the shared client libraries (`@ovaultd/protocol`, `@ovaultd/crypto`, `@ovaultd/core`) and the CLI live in the main repository.

## Requirements

- Node 22+.
- (From the sync-engine cut onward) the main repository checked out as a sibling directory (`../ovaultd`), until `@ovaultd/*` is published.

## Development

```bash
npm install
npm run dev            # esbuild in watch mode → main.js
npm run build          # typecheck (tsc -noEmit) + production build
```

Install the build into a real Obsidian vault:

```bash
npm run install:dev -- --vault "$HOME/tmp/ovaultd-device-a"
```

Then, in Obsidian: enable community plugins → enable **Self-hosted Sync** → plugin settings → set the server URL → *Probar* (the button does a `GET /healthz` with plain `fetch`, so it exercises the exact CORS path the sync engine will use).

The bundle keeps `obsidian`/`electron` external and **fails the build** if any Node builtin (`fs`, `path`, `child_process`, …) leaks into the bundle: the same `main.js` must run on mobile, where Node does not exist.

## Leak gate

Before every push: `scripts/scan-leaks.sh` (plus `.githooks/pre-commit`, activated with `git config core.hooksPath .githooks`). Personal patterns go in `scripts/leaks.local` (never versioned).

License: MIT — see `LICENSE`.
