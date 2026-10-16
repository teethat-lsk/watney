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

## Login

Staff log in with an account from PocketBase's `users` collection. For local development, create the first admin with `make seed` in `../backend` (see its README). The session is kept in the browser's local storage until you log out or it expires.

The admin calls PocketBase at its own origin (`/api/…`). In development, the Vite dev server forwards `/api` to http://localhost:8090 (`vite.config.ts`). In production, PocketBase serves the built admin itself. Either way, no backend URL needs configuring. If PocketBase isn't running, the login form says it can't reach the server.

| File | What |
|---|---|
| `src/auth.ts` | The `Auth` interface and its PocketBase implementation. It turns SDK errors into `invalid` or `unreachable`. |
| `src/LoginForm.tsx`, `src/Home.tsx` | Login form, and the placeholder home screen that shows who is logged in |
| `src/App.tsx` | Shows one or the other; takes an `Auth`, so tests pass a fake |
