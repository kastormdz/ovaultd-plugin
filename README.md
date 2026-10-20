# oVaultd Sync

This is the Obsidian side of [ovaultd](https://github.com/kastormdz/ovaultd): the plugin that syncs your vault against your own server, inside the editor, with the keys never leaving your machine.

The plugin is not a thin HTTP client. It embeds the same durable core as the CLI: a versioned IndexedDB state store, a save-first outbox, an apply journal and the same sync session. So the plugin and the CLI are two windows onto one engine, not two implementations that drift apart.

The server, the shared libraries (`@ovaultd/protocol`, `@ovaultd/crypto`, `@ovaultd/core`) and the CLI live in the main repository. This one holds the plugin alone, because the community directory wants the manifest and the release assets at the root of the submitted repository.

## What it does

Sync is event driven. Vault changes are coalesced, then a debounced `pull` and `push` cycle runs under a lock, so there are no timers and no polling: a change is what wakes it up. The status bar tells you where it stands (`al día`, `sincronizando…`, `⚠ conflictos`, `error`).

When the same file changed on two devices, the plugin tells you and asks. Keep your version or take the remote one; neither side disappears without your say-so. If several files are conflicted, you can resolve them one by one or apply the same choice to all of them.

Vault management lives in the settings tab: create a vault, link an existing one, unlink this folder, delete a vault by typing its name, recover access with the recovery key when the vault password is lost, and change the vault password. Export writes the remote vault to a folder you pick; import reads one into the vault, after the portable path validation runs.

The bundle keeps `obsidian` and `electron` external and fails the build if any Node builtin (`fs`, `path`, `child_process`, …) leaks in. The same `main.js` has to run on mobile, where Node does not exist, so crypto, state and sync are plain browser JavaScript.

Local state stays small and bounded: IndexedDB for the engine, a `estado-local.json` for the account token, vault id/epoch and derived subkeys, a `sesion-cuenta.json` for the account session, and a capped `motor.log`. Passwords are never written to disk.

## How sync works, in one paragraph

Your vault password is stretched into a KEK, which unwraps the vault key. From those, per-content keys and signing keys are derived. Changed files are encrypted and uploaded as opaque blobs; the server stores them with signed revision records chained by `expected_rev`. Pulling is a delta since your last known revision, pushing signs every operation. If someone edited ahead of you, you get a conflict instead of a lost edit.

## Versions

The plugin travels on a release train with the server: the same `MAJOR.MINOR` on both sides is a pair that was tested together, and patches are independent.

| Server | Plugin | Wire |
|---|---|---|
| `0.2.x` | `0.2.x` | `v2` |

Before linking anything, the plugin asks the server `GET /api/v1/meta` and checks the contract. If the server requires a newer plugin than this one, it refuses to link and says so. If this plugin is one train ahead, it warns once and goes on. It also identifies itself on every request with `x-ovaultd-client: oVaultd-plugin/<version>`, so the server logs show which client is talking.

## Install

From the community directory: in Obsidian, Settings, Community plugins, Browse, search for **oVaultd Sync**, then Install and Enable.

[![oVaultd Sync in the community directory](https://img.shields.io/badge/Obsidian-community%20directory-7C3AED)](https://community.obsidian.md/plugins/ovaultd)

Or link straight in: [`obsidian://show-plugin?id=ovaultd`](obsidian://show-plugin?id=ovaultd) · [community.obsidian.md/plugins/ovaultd](https://community.obsidian.md/plugins/ovaultd)

To build it yourself and drop it into a vault:

```bash
npm install
npm run build
npm run install:dev -- --vault "$HOME/path/to/your/vault"
```

Then enable it in Obsidian under Settings, Community plugins. Hand copying works too: the three files (`main.js`, `manifest.json`, `styles.css`) go into `<vault>/.obsidian/plugins/ovaultd/`.

## Usage

Everything starts in Settings, **oVaultd Sync**:

1. **Cuenta**: server URL, account email and account password. This is asked once; the session is reused after that.
2. **Tus vaults**: every vault on the account, with the actions for each one. Link it, recover access with the recovery key, or delete it. **Crear vault nuevo…** asks for a name and a vault password you invent, and shows the recovery key exactly once.
3. **Esta carpeta**: the linked vault, with the sync status, **Sincronizar ahora**, **Cambiar password…** and **Desvincular**.

There are two secrets and they are easy to confuse. The account password is what the server verifies. The vault password is what opens your notes and never reaches the server. Losing the vault password is not fatal, because the recovery key is the second lock.

The command palette (Ctrl+P) has *Probar conexión*, *Sincronizar ahora*, *Estado del motor*, *Exportar el vault a una carpeta…*, *Importar una carpeta al vault…* and *Resolver conflicto…*.

## Network and privacy

Following the community directory's [developer policies](https://docs.obsidian.md/community-directory/developer-policies):

- The plugin talks only to the server URL you configure. That is your server, or the one your operator runs. No third-party services, no analytics, no telemetry, no ads.
- Syncing needs an account on that server. The first one is created in the browser at `/setup`, and it never leaves your infrastructure.
- Export writes into a folder you pick and import reads from one. They run only when you invoke them, and nothing else reaches outside the vault.
- The server stores ciphertext, opaque path IDs and signed revision records. It cannot read your notes or your paths.

## Requirements

- An ovaultd server from the [main repository](https://github.com/kastormdz/ovaultd): one container, published on loopback, behind your own reverse proxy.
- An account on it. The first one comes from `/setup` in the browser; the rest from the admin panel or the `ovaultd-admin` CLI.
- To build from source: Node 22+, with the main repository checked out as a sibling directory (`../ovaultd`), because `@ovaultd/*` is not published to npm.

## Contributing

Building the plugin, refreshing the vendored core and running the leak gate: [docs/development.md](docs/development.md).

## License

MIT. See `LICENSE`.
