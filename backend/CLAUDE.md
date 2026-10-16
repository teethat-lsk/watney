# backend — PocketBase

Collections, API rules, hooks and sync rules are specified in `../docs/tech-spec.md` §4, §6 and §8. Read those sections before adding a collection, rule or hook.

- **Version:** pinned in `.pocketbase-version`. Look up APIs in the docs for that exact version; PocketBase 0.x releases have broken APIs, and many examples online target older ones.
- **Migrations are the schema.** Every change to a collection, field, index or API rule lands as a JS migration in `pb_migrations/` and is committed. Dashboard edits generate one there automatically (automigrate); review it before committing.
- **Hooks** (`pb_hooks/*.pb.js`) run in PocketBase's embedded JS engine (goja), which has no Node APIs and no npm packages. Each handler runs in an isolated context and sees only what it declares or `require()`s inside itself, so put shared code in a module and require it within the handler. Editor type definitions are generated at `pb_data/types.d.ts`.
- **Done** means `make check` passes: it boots PocketBase on a throwaway data dir with the committed migrations and hooks.
