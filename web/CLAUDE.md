# web — admin

Scope and the library table are in `../docs/tech-spec.md` §5.

- **Pinned majors:** React 18.3, Vite 5, TypeScript 5, Vitest 2. pnpm will report newer majors; stay on these. Add a library from the §5 table when an issue first needs it, at the major the table lists.
- **pnpm 11 blocks dependency install scripts.** When a new package needs one, allow it under `allowBuilds` in `pnpm-workspace.yaml`; `pnpm approve-builds` is interactive.
- **Backend:** reach it only through the PocketBase JS SDK, at a release compatible with `../backend/.pocketbase-version`. Locally it runs separately on http://localhost:8090 (`make dev` in `../backend`).
- **UI language is Thai**, using the domain terms from the planning docs at the repo root.
- **Done** means `make check` passes (lint, test, build).
