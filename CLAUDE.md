# CLAUDE.md

Guidance for AI agents working in this repository.

## Components

`backend/` (PocketBase), `web/` (React admin) and `mobile/` (Flutter field app) are self-contained. Each has its own toolchain, dependencies, `CLAUDE.md`, and `make setup | dev | check`. Components talk only through the PocketBase API, and the schema in `backend/pb_migrations/` is that contract, so a slice that spans components changes the backend first. Run `make check` in every component you changed.

## Agent skills

### Issue tracker

Issues and specs live as **GitHub issues**, managed with the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

The five canonical triage roles, each label string equal to its name (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

**Single-context** — `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.
