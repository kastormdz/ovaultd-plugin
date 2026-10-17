# ovaultd-plugin

The Obsidian plugin for **ovaultd** — self-hosted, end-to-end encrypted sync for your vault: [github.com/kastormdz/ovaultd](https://github.com/kastormdz/ovaultd).

**Status: phase 3 in progress** — the plugin shell, the vault adapter (the `FileSystemPort` of the core over Obsidian's `DataAdapter`), the event bridge with 250 ms coalescing + hash-based self-change filtering, and **the sync engine wired in**: the core (`@ovaultd/core`: state store, reconciliation, push/pull, explicit conflicts) runs inside the renderer with IndexedDB as durable state. Next cuts: two real vaults with a live conflict (3c), end-to-end tests (phase 4), conflict resolution + history + restore (phase 5).

Why a separate repository: the community directory requires the plugin manifest and release assets at the root of the submitted repository, one release per version. The server, the shared client libraries (`@ovaultd/protocol`, `@ovaultd/crypto`, `@ovaultd/core`) and the CLI live in the main repository.

## Requirements

- Node 22+.
- The main repository checked out as a sibling directory (`../ovaultd`), until `@ovaultd/*` is published.

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

The bundle keeps `obsidian`/`electron` external and **fails the build** if any Node builtin (`fs`, `path`, `child_process`, …) leaks into the bundle: the same `main.js` must run on mobile, where Node does not exist. The whole engine (crypto, state, sync) is browser-grade JavaScript — no Node APIs, no Node polyfills.

## Usage

Settings → **Self-hosted Sync**:

| Field | What it is |
|---|---|
| **Server** | Base URL of your ovaultd server (e.g. `https://sync.example.com`). Persisted in the plugin data. |
| **Account email** | Your account on the server (created by the admin via `ovaultd-admin create-account`, or the first one through the web bootstrap `/setup`). Persisted. |
| **Account password** | Used once for the device sign-in. Lives only in the form — never written to disk. |
| **Vault number** | The `#` of the remote vault (start with `1`). Persisted. |
| **Vault password** | Derives the KEK and unwraps the vault key locally (KEK → unwrap → subkeys). The server never sees it; it lives only in the form. |

Press **Vincular** (link): sign-in → vault material → local key derivation → the engine starts and does its first cycle. From then on it is event-driven: coalesced vault changes trigger a `pull → push` cycle with a global 1.5 s debounce and a lock. The status bar shows the phase (`al día`, `sincronizando…`, `⚠ conflictos`, `error`).

What is persisted where: account token, vault uuid/epoch and the derived **subkeys** go to `.obsidian/plugins/ovaultd/estado-local.json` (outside `data.json`, deliberately: `data.json` is a candidate for the future white-listed config sync). `motor.log` next to it keeps a bounded phase log. Neither file is visible to the vault watcher (dotfiles emit no events — measured in the spike).

Commands: *Probar conexión* (raw `fetch` against `/healthz` — the exact CORS path the engine uses), *Sincronizar ahora* (full cycle on demand), *Estado del motor*, plus the event-spike recorder used during development (`docs/spike-eventos.md`).

## Leak gate

Before every push: `scripts/scan-leaks.sh` (plus `.githooks/pre-commit`, activated with `git config core.hooksPath .githooks`). Personal patterns go in `scripts/leaks.local` (never versioned).

License: MIT — see `LICENSE`.
