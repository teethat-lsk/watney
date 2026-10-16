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

Staff log in with an account from PocketBase's `users` collection. For local development, create the first admin with `make seed` in `../backend` (see its README). The session is kept in the browser's local storage until you log out or it expires. On start, the admin checks a stored session with the backend: it picks up a changed role, and goes back to the login form if the account was deactivated. A deactivated account gets its own message at login.

The admin calls PocketBase at its own origin (`/api/…`). In development, the Vite dev server forwards `/api` to http://localhost:8090 (`vite.config.ts`). In production, PocketBase serves the built admin itself. Either way, no backend URL needs configuring. If PocketBase isn't running, the login form says it can't reach the server.

## Pages and roles

Each page in `src/App.tsx` lists the roles that may use it. The menu shows only those pages, and opening another one by its URL says there's no access. The backend's access rules enforce the same limits, so hiding a menu is only a convenience.

| Page | Roles |
|---|---|
| ผู้ใช้น้ำ (`/customers`): the customer register, searchable by name, house number or meter number, and filtered by หมู่, route and status | office, admin |
| เพิ่มผู้ใช้น้ำ (`/customers/new`): register a customer, with their first meter (then they're active) or without one (pending) | office, admin |
| A customer (`/customers/:id`): edit their details and status, register their meter (one in use at a time; a pending customer becomes active), remove a meter | office, admin |
| เส้นทาง (`/routes`): add and rename routes | office, admin |
| พนักงาน (`/staff`): create staff, set their role and password, assign routes to meter readers, deactivate staff | admin |

## Code

| File | What |
|---|---|
| `src/auth.ts` | The `Auth` interface and its PocketBase implementation. It turns SDK errors into `invalid` or `unreachable`. |
| `src/api.ts` | The `Api` interface: one repository per kind of data (`staff.ts`, `routes.ts`, `customers.ts`), each with a PocketBase implementation. Pages take the `Api`. |
| `src/queries.ts` | React Query cache keys shared between pages |
| `src/formError.ts` | Turns PocketBase field validation errors into a `FormError`, and picks the Thai message to show |
| `src/App.tsx` | The login form, or the pages for the logged-in role. It takes an `Auth` and an `Api`, so tests pass fakes (`src/testing.tsx`). |
| `src/Layout.tsx`, `src/Home.tsx`, `src/*Page.tsx` | The menu and header, and the pages |

Data is fetched and cached with React Query; routing uses React Router.
