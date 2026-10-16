# web — admin

The office and executive admin: React 18.3 + Vite 5 + TypeScript 5, tested with Vitest 2 and Testing Library. Locally it runs on the Vite dev server; in production its static build is served by PocketBase. Libraries for routing, data fetching, styling and forms are added by the issues that need them (see [docs/tech-spec.md](../docs/tech-spec.md) §5).

## Commands

Run in this folder (or `make web`, `make web-setup`, `make web-check` from the repo root):

| Command | What it does |
|---|---|
| `make setup` | `pnpm install` |
| `make dev` | Dev server on http://localhost:5173 |
| `make check` | Lint, test, then type-check and build to `dist/` |

For pages that call the backend, start it separately in another terminal: `make dev` in `../backend`.
