---
name: start-local-development
description: Start local development lean — check what's already running, start only the components the task needs (backend, web, mobile, phone), and suggest what to stop to free memory. Use when the user begins a task and asks what to run, or the machine is short on memory.
---

# Start local development

Run only what the user's task needs: reuse what's already running, and free the memory held by anything the task doesn't need. The Makefiles and [`docs/local-development.md`](../../../docs/local-development.md) (§5 and §6) say how to start each component. This skill decides which ones.

Each component (`backend/`, `web/`, `mobile/`) has its own `make setup | dev | check`. From the repo root, `make <component>` runs its `dev`. All paths below are relative to the repo root (`git rev-parse --show-toplevel`), and the session may have started inside a component folder.

All of WSL2 runs in one VM. Its memory cap is `memory=` in the Windows `%UserProfile%\.wslconfig`, and without that line the cap is half the Windows RAM. Every running distro draws from the same cap, including Docker Desktop's `docker-desktop`.

Rules for every step:

- **Announce** each action before you run it, in one short line that names the command and why: "Starting PocketBase (`make backend`) on :8090 for the admin pages". A batch of parallel probes shares one line.
- **Probes** are read-only and run without asking. Starting or stopping any component runs only after the user says yes. One question can cover several components, and each one the user ticks is a yes.
- For processes that aren't Watney's (other projects, editors, other Claude Code sessions, Docker Desktop), you only suggest. The user stops them.
- Each decision goes to the user as a short multiple-choice question (AskUserQuestion), recommended option first.

## 1. Task

Ask what the user is about to work on, unless they've already said. For an issue number, read it with `gh issue view <n> --comments` and map its "What to build" section.

| Task | backend | web | mobile | phone |
|---|---|---|---|---|
| Planning, docs, issue triage | – | – | – | – |
| Pure Dart logic (billing, receipt formatting, PromptPay payload) | – | – | `flutter test` only | – |
| Schema, migrations, API rules, hooks | ✔ | – | – | – |
| Admin pages that call the API | ✔ | ✔ | – | – |
| Admin UI without API calls (layout, components, their tests) | – | ✔ | – | – |
| Field-app screens that call the API | ✔ | – | ✔ | ✔ |
| Offline sync | ✔, stopped and restarted to simulate going offline | – | ✔ | ✔ |
| Bluetooth printing | when the receipt data comes from the API | – | ✔ | ✔ + printer |
| End-to-end across both apps | ✔ | ✔ | ✔ | ✔ |

- **mobile ✔** means `make mobile`: Gradle builds a debug APK, then `flutter run` stays attached to the phone.
- **`flutter test` only** runs on the Dart VM, with no Gradle and no device.

Done when the task maps to one or more rows. If it fits none, ask.

## 2. Probe

Run these in parallel:

- **Ports:** `ss -ltnp | grep -E ':(8090|5173)\b'` shows PocketBase (8090) and Vite (5173).
- **Processes:** `ps -eo pid,rss,etime,args --sort=-rss | head -40`. `readlink /proc/<pid>/cwd` shows which project a process belongs to.
- **Memory:** `free -h`, and the cap from `/mnt/c/Users/<you>/.wslconfig`.
- **Distros:** `wsl.exe -l -v | tr -d '\0\r'`. A running `docker-desktop` means Docker Desktop is up.
- **Docker:** if `docker` exists, `docker ps`. Watney itself runs no containers.
- **Phone:** `adb devices`, only when the task needs a phone.

Attribute every process using 100 MB or more of RSS:

| Pattern in its command line | What it is |
|---|---|
| `pocketbase serve` | backend (its cwd shows which project) |
| `vite` | web dev server (its cwd shows which project) |
| `GradleDaemon`, `KotlinCompileDaemon` | Android build daemons |
| `flutter_tools`, `frontend_server` | an attached `flutter run` |
| `analysis_server`, `language-server`, `tsserver`, `.vscode-server` | editor tooling |
| `claude`, `ccd-cli` | Claude Code sessions |

Show the user a table: process, what it is, project, RSS, running time. Done when every process of 100 MB or more is attributed.

## 3. Plan

Compare what the task needs with what's running:

- **Reuse** a needed component that already answers on its port. A second copy would fail on the busy port anyway.
- **Start** each needed component that isn't running.
- **Stop:** Watney components the task doesn't need, build daemons when the task needs no Android build, and an attached `flutter run` the task doesn't need. Also suggest stopping Docker Desktop and other projects' servers when the user isn't using them.

Weigh each stop by what it frees. Heaviest first:

1. **Gradle and Kotlin daemons.** Their heap limit is `org.gradle.jvmargs`, and they idle after a build until `org.gradle.daemon.idletimeout` (both in `mobile/android/gradle.properties`). To stop them now, run `mobile/android/gradlew --stop` and `pkill -f KotlinCompileDaemon`. `gradlew` is git-ignored and appears after the first Android build. Until then, use `pkill -f GradleDaemon`.
2. **Editor tooling.** Each editor window runs language servers for every language it sees. For a one-component task, suggest the README's "Working on one component" setup: open only that component's folder in the editor, and start Claude Code inside it.
3. **Claude Code sessions:** a few hundred MB each. Idle ones can be closed.
4. **Docker Desktop:** its memory comes out of the same WSL cap.
5. **An attached `flutter run`:** press `q` in its terminal.
6. **Vite and PocketBase:** light. Stopping them frees little, so keep whichever the task needs.

Linux page cache (`buff/cache` in `free`) is reclaimable, so it's never a reason to stop anything. Running `wsl --shutdown` on Windows frees everything, but it stops every distro and process: a last resort, and the user's call.

Ask two multi-select questions: one for the start list and one for the stop list, recommended options first. Done when the user has picked both.

## 4. Apply

1. **Stop** what the user picked. Watney processes and build daemons: run the stop yourself. Everything else: hand the user the command or action.
2. **Start** the backend and the web admin, whichever the user picked:
   - If you'll work against them in this session, run `make backend` and `make web` in the background, so you can read their logs.
   - Otherwise, hand the user those commands to run in their own terminals.
3. **Staff login:** admin pages and field-app screens need a staff account. If `grep -cE '^WATNEY_SEED_ADMIN_(EMAIL|PASSWORD)=.+' backend/.env` doesn't print 2, the admin was likely never seeded. Hand the user the seed steps from doc §4.
4. **Mobile:** always hand `make mobile` to the user, because `flutter run` takes keystrokes (`r` for hot reload, `q` to quit). Walk through phone setup with doc §6.1 and §6.2 when the phone isn't connected yet.
5. **Wait** until each component answers: `curl -fsS http://localhost:8090/api/health` and `curl -fsS -o /dev/null http://localhost:5173`.

Done when every needed component answers.

## 5. Report

Re-run step 2's port and process probes, then end with **Running now**: one row per component running at the end, whoever started it. Give its address, RSS, who started it (this session's background task, the user's terminal, or already running before), and how to stop it (Ctrl-C in its terminal, or the background task). Under the table, list:

- what was stopped;
- memory before and after (`used` and `available` from `free -h`).
