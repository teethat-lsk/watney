# backend — PocketBase

PocketBase runs locally on the developer's machine during the current phase (see [docs/tech-spec.md](../docs/tech-spec.md) §4 and §12). Fly.io hosting comes later.

## Version

The PocketBase version is pinned in [`.pocketbase-version`](.pocketbase-version). PocketBase has had breaking changes between releases, so change it deliberately and in its own commit. `scripts/install-pocketbase.sh` downloads that exact version into `bin/` and verifies the release checksum.

## Commands

Run in this folder (or `make backend`, `make backend-setup`, `make backend-check`, `make backend-seed` from the repo root):

| Command | What it does |
|---|---|
| `make setup` | Download the pinned PocketBase into `bin/` |
| `make dev` | Start PocketBase on `0.0.0.0:8090` (set `PB_HTTP` to change the address) |
| `make check` | Boot PocketBase on a throwaway data dir with the committed migrations and hooks, then check that a seeded admin can log in and that a wrong password and public sign-up are rejected |
| `make seed` | Create the first admin staff user from `.env`, or update its password and name |

- Dashboard: http://localhost:8090/_/
- REST API: http://localhost:8090/api/ (health check: `/api/health`)

On first start PocketBase prints a link to create the first superuser (dashboard account). You can also create one directly:

```bash
bin/pocketbase superuser upsert you@example.com 'a-strong-password' --dir pb_data
```

A superuser is an operator account for this dashboard. Staff log in to the apps with accounts in the `users` collection instead. Each account has a `role`: `meter_reader`, `office` or `admin`. For local development, create the first admin staff user like this:

```bash
cp .env.example .env   # then change the email and password in .env
make seed
```

`.env` is git-ignored. You can run `make seed` while PocketBase is running, and run it again to change the password. Until #3 adds role-based rules, only superusers can create or edit staff: public sign-up and self-edits are closed.

## Layout

| Path | In git | Purpose |
|---|---|---|
| `pb_migrations/` | yes | Schema migrations (JS). With automigrate on, collection changes made in the dashboard are written here — commit them. |
| `pb_hooks/` | yes | Server-side JS hooks (`*.pb.js`). `seed.pb.js` adds the `seed` command. |
| `scripts/` | yes | `install-pocketbase.sh`, `serve.sh`, `check.sh`, `seed.sh` |
| `.env.example` | yes | Keys for `.env`, the local seed credentials |
| `.env` | no | Your local seed credentials |
| `pb_data/` | no | Local SQLite database, uploaded files, logs |
| `bin/` | no | The downloaded PocketBase binary |

To reset local data, stop PocketBase and delete `pb_data/`. Migrations rebuild the schema on the next start.

## Reaching the backend from a phone

| Client | Address |
|---|---|
| Browser on this computer | `http://localhost:8090` |
| Android emulator | `http://10.0.2.2:8090` |
| Real phone on the same Wi-Fi | `http://<computer's LAN IP>:8090` |

**On WSL2** the default NAT networking hides WSL from the LAN, so a real phone can't connect until you do one of these on Windows (in an admin PowerShell):

- **Port proxy (any Windows version):** forward the port to WSL's current IP (`hostname -I` inside WSL; it changes after a restart, so re-run the proxy command then) and open the Windows firewall:
  ```powershell
  netsh interface portproxy add v4tov4 listenport=8090 listenaddress=0.0.0.0 connectport=8090 connectaddress=<WSL IP>
  New-NetFirewallRule -DisplayName "Watney PocketBase" -Direction Inbound -Protocol TCP -LocalPort 8090 -Action Allow
  ```
- **Mirrored networking (Windows 11 22H2+ only):** add `networkingMode=mirrored` under `[wsl2]` in `%UserProfile%\.wslconfig`, run `wsl --shutdown`, then allow the port through the Hyper-V firewall. The IP never changes, so nothing needs re-running.
  ```powershell
  New-NetFirewallHyperVRule -Name WatneyPocketBase -DisplayName "Watney PocketBase" -Direction Inbound -VMCreatorId '{40E0AC32-46A5-438A-A0B2-2B479E8F2E90}' -Protocol TCP -LocalPorts 8090
  ```

Either way, the phone uses the Windows machine's LAN IP.

The Android emulator works without either change, because WSL forwards `localhost` to Windows.
