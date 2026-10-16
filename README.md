# watney

Meter reading and billing for Thai village water supplies (ประปาหมู่บ้าน): a Flutter field app for meter readers, a React admin for the office, and a PocketBase backend. Everything runs locally during the current phase.

## Layout

| Folder | What |
|---|---|
| [`mobile/`](mobile/README.md) | Flutter field app (Android first) |
| [`web/`](web/README.md) | React + Vite admin |
| [`backend/`](backend/README.md) | PocketBase: pinned version, migrations, hooks |
| [`docs/`](docs/) | [Tech spec](docs/tech-spec.md), [ADRs](docs/adr/), [research](docs/research/), agent config |

The original requirement documents (Thai) are at the repo root. Work is tracked in [GitHub issues](https://github.com/teethat-lsk/watney/issues).

## Working on one component

Each component is self-contained: its own toolchain, dependencies, README, `CLAUDE.md`, and the same three commands, `make setup`, `make dev` and `make check`. Install and run only the part you're working on:

| Component | Needs | Start |
|---|---|---|
| backend | `curl`, `unzip` (setup downloads PocketBase) | `make backend` |
| web | Node.js + pnpm | `make web`, with the backend running in another terminal when pages call it |
| mobile | Flutter stable 3.27+, Android SDK | `make mobile` |

From the repo root, `make <component>-setup` and `make <component>-check` run the other two commands. Run `make help` to list them.

To keep memory use down, open only the component's folder in your editor and start Claude Code inside it (`cd web && claude`). The editor then runs only that language's tooling, and the agent loads only that component's `CLAUDE.md` (plus the root one).
