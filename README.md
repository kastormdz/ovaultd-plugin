# ovaultd-plugin

The Obsidian plugin for **ovaultd** — self-hosted, end-to-end encrypted sync for your vault: [github.com/kastormdz/ovaultd](https://github.com/kastormdz/ovaultd).

Everything runs inside Obsidian. The plugin embeds the same durable core as the CLI (versioned IndexedDB state, save-first outbox, apply journal), so your vault stays in sync with your own server — and the server never sees your notes: content and paths are encrypted on your device with keys derived from your vault password, which never leaves it.

The server, the shared libraries (`@ovaultd/protocol`, `@ovaultd/crypto`, `@ovaultd/core`) and the CLI live in the main repository. This repository holds the plugin alone — the community directory requires the manifest and the release assets at the root of the submitted repository.

## What it does

- **Event-driven sync.** Vault changes are coalesced, then a debounced `pull → push` cycle runs under a lock. No timers, no polling: a change is what wakes it up. The status bar shows its state (`al día`, `sincronizando…`, `⚠ conflictos`, `error`).
- **Explicit conflicts, never silent overwrites.** When the same file changed on two devices, the plugin reports the conflict and asks: keep your local version or take the remote one. Neither side is discarded without your say-so.
- **Vault management from the settings tab.** Create a vault, link an existing one, unlink the folder, delete a vault (typing its name to confirm), recover access with the recovery key when the vault password is lost, and change the vault password.
- **Export / import.** Write the remote vault to a local folder, or import a folder into the vault. The portable validation runs before anything is written.
- **Mobile-grade by construction.** The bundle keeps `obsidian`/`electron` external and **fails the build** if any Node builtin (`fs`, `path`, `child_process`, …) leaks in — the same `main.js` must run on mobile, where Node does not exist. Crypto, state and sync are plain browser JavaScript.
- **Durable, bounded local state.** The engine's state lives in IndexedDB; the plugin folder keeps a small `estado-local.json` (account token, vault id/epoch, derived subkeys), `sesion-cuenta.json` (your account session, survives unlinking) and a bounded `motor.log`. Passwords are never written to disk.

## How sync works, in one paragraph

Your vault password is stretched into a KEK, which unwraps the vault key; from those, per-content keys and signing keys are derived. Changed files are encrypted and uploaded as opaque blobs; the server stores them with signed revision records chained by `expected_rev`. Pulling is a delta since your last known revision; pushing signs every operation. If someone else edited ahead of you, you get a conflict instead of a lost edit.

## Compatibility

The plugin travels on a **release train** with the server: the same `MAJOR.MINOR` on both sides is a pair that was tested together (patches are independent).

| Server | Plugin | Wire |
|---|---|---|
| `0.2.x` | `0.2.x` | `v2` |

Before linking anything, the plugin asks the server `GET /api/v1/meta` and checks that contract: if the server requires a newer plugin than this one, it refuses to link and says so (with a message pointing at the plugin); if this plugin is a train ahead, it warns once and goes on. It also identifies itself on every request with `x-ovaultd-client: oVaultd-plugin/<version>`, so the server's logs show which client is talking.

## Releases

Releases are cut by tag: `plugin-vX.Y.Z` builds the plugin with the very same anti-Node build used in development, and attaches `ovaultd-plugin-X.Y.Z.zip` — with `main.js`, `manifest.json` and `styles.css` — to the GitHub Release. That is the layout BRAT and the community directory expect: one release per version, with the binaries attached.

Unpack the zip into `<vault>/.obsidian/plugins/ovaultd/`, or point BRAT at this repository. What changed in each version lives in [CHANGELOG.md](CHANGELOG.md), and the release notes are taken from there.

## Requirements

- An **ovaultd server** ([main repository](https://github.com/kastormdz/ovaultd)) — a single container, published on loopback, behind your own reverse proxy.
- An **account** on it: the first one is created in the browser at `/setup`; further accounts come from the admin panel or the `ovaultd-admin` CLI.
- For building from source: Node 22+, and the main repository checked out as a sibling directory (`../ovaultd`) while `@ovaultd/*` is not published to npm.

## Install

Build it and install into a vault:

```bash
npm install
npm run build
npm run install:dev -- --vault "$HOME/path/to/your/vault"
```

Then enable it in Obsidian: Settings → Community plugins → **oVaultd Plugin**. (The same three files — `main.js`, `manifest.json`, `styles.css` — can be copied by hand into `<vault>/.obsidian/plugins/ovaultd/`.)

## Usage

Settings → **oVaultd Plugin**:

1. **Cuenta** — server URL, account email and account password. This is asked **once**: the session is reused from then on.
2. **Tus vaults** — every vault on the account, with the actions for each one: link, recover access (with the recovery key), or delete. A new vault is created with **Crear vault nuevo…** (name + a vault password *you invent*; the recovery key is shown exactly once — store it somewhere safe).
3. **Esta carpeta** — the linked vault: sync status, **Sincronizar ahora**, **Cambiar password…** and **Desvincular**.

Two different secrets, easy to confuse: the **account** password (which the server knows how to verify) and the **vault** password (which the server never sees — it opens your notes). Losing the vault password is not fatal: the recovery key is the second lock.

Commands in the palette (Ctrl+P): *Probar conexión*, *Sincronizar ahora*, *Estado del motor*, *Exportar el vault a una carpeta…*, *Importar una carpeta al vault…*, *Resolver conflicto…*.

## Development

```bash
npm install
npm run dev            # esbuild in watch mode → main.js
npm run build          # typecheck (tsc -noEmit) + production build (with the anti-Node gate)
```

Sync is the risky part, so the loop for changes that touch it: build, copy to a real vault, and watch `motor.log` and the status bar — the engine is designed to be observed. The repository ships `docs/spike-eventos.md`, a measured report on how Obsidian's watcher actually behaves (external renames arrive as create+delete, dotfiles emit no events, content is stable by the time the event lands) — those measurements are what the engine is built on.

## Leak gate

Before every push: `scripts/scan-leaks.sh` (plus `.githooks/pre-commit`, activated with `git config core.hooksPath .githooks`). Personal patterns go in `scripts/leaks.local` (never versioned).

## License

MIT — see `LICENSE`.
