---
name: setup-local-development
description: Local development setup walkthrough — probe every tool docs/local-development.md lists, suggest the doc's install for each missing one, and advise on upgrades. Use when the user wants to set up, check, or fix their dev environment.
---

# Setup local development

Walk the user through getting their machine ready to run Watney, one tool at a time. [`docs/local-development.md`](../../../docs/local-development.md) is the source of truth for what to install, which version, and how. This skill is the process.

The **target** is the version a tool must have: the doc's §2 table, overridden by a project file wherever the two disagree (`backend/.pocketbase-version`, the `environment.sdk` constraint in `mobile/pubspec.yaml`, `web/package.json`, the Makefiles). A doc row that disagrees with a project file is **stale**. Collect stale rows for the report.

Each component (`backend/`, `web/`, `mobile/`) has its own `make setup | dev | check`. From the repo root, the same commands are `make <component>-setup`, `make <component>` and `make <component>-check`. All paths below are relative to the repo root (`git rev-parse --show-toplevel`), and the session may have started inside a component folder.

Rules for every step:

- **Announce** each action before you run it, in one short line that names the command and why: "Checking which JDK Flutter builds with (`flutter doctor -v`)". A batch of parallel probes shares one line.
- **Probes** are read-only and run without asking. Everything else runs only after the user says yes: installs, config changes, `make <component>-setup` and `-check`, and starting any component. One question can cover several actions, and each one the user ticks is a yes.
- Commands that need `sudo`, an admin PowerShell on Windows, or a hand on the phone go to the user in a fenced `bash` or `powershell` block to run themselves. Re-probe once they say it's done.
- Each decision goes to the user as one short multiple-choice question (AskUserQuestion), recommended option first, with its trade-off in the option's description.

## 1. Scope

1. Ask which components the user will work on: `backend`, `web`, `mobile` (multi-select). Backend is always in scope: its setup is one small download, and web pages and field-app screens that call the API need it running. The **Needed for** column of the doc's §2 maps components to tools.
2. Detect the platform:
   - WSL2: `uname -r` contains `microsoft`. Read the Windows build with `cmd.exe /c ver`. Build 22000+ is Windows 11, and mirrored networking needs 22621+ (Windows 11 22H2). Below that, the doc's port-proxy path (§6.2) applies.
   - Other OS: the doc is written for WSL2 Ubuntu. Use that platform's equivalent install commands, and say so when suggesting them.

Done when the component set and the platform are known.

## 2. Probe

Read the doc's §2 in full. Then probe every tool row in scope, plus project state, running independent probes in parallel. Most tools answer `<tool> --version`. These need more:

| Row | Probe | Target |
|---|---|---|
| Flutter / Dart | `flutter --version` | Dart version satisfies `environment.sdk` in `mobile/pubspec.yaml` |
| JDK | `flutter doctor -v`, the "Java binary at" and "Java version" lines. This is the JDK Flutter builds with, which can differ from `java -version`. | doc §2.5 |
| Android SDK | `flutter doctor -v` (Android toolchain section), then `sdkmanager --list_installed` for the platform and NDK versions | doc §2.6 |
| PocketBase | `backend/bin/pocketbase --version` | exact match with `backend/.pocketbase-version` |
| Web packages | `web/node_modules/.modules.yaml` exists and is not older than `web/pnpm-lock.yaml` | — |
| Mobile packages | `mobile/.dart_tool/package_config.json` exists and is not older than `mobile/pubspec.lock` | — |
| Phone (mobile) | `adb devices` lists a device | doc §6.1 |
| Phone → backend (WSL on Windows 10) | `netsh.exe interface portproxy show v4tov4` maps port 8090 to WSL's current IP (`hostname -I`) | doc §6.2 |

Give each row a status, with the version found:

- ✅ meets the target
- ⚠️ installed, but misses the target or is misconfigured
- ❌ missing

Hardware the user hasn't connected yet (phone, printer) is **pending**: a later step, not a failure.

Show the user the full table before changing anything. Done when every in-scope row has a status.

## 3. Assess versions

For every ⚠️ row, pick the recommendation:

- **Below the target** (older than a minimum, or not the pinned version): an upgrade is required. Recommend the doc's command.
- **Above the tested version** (the doc names a known-good version and the installed one is newer, like JDK 25 against JDK 21): recommend installing the known-good version alongside it and pointing the project at it, as the doc's `flutter config --jdk-dir` does, so the system default stays.
- **PocketBase off its pin:** `make backend-setup` restores the pinned version. Changing `.pocketbase-version` is its own decision and commit (`backend/README.md`), outside setup.

A ✅ row stays as it is. The target is the bar, not the newest release. The project pins versions on purpose, such as the web majors in `web/CLAUDE.md` and PocketBase's exact version.

Ask one question per ⚠️ row. Offer "Fix now" (or "Upgrade now") as the recommended option, then "Keep as is" and "Later". Done when every ⚠️ row has the user's decision.

## 4. Install

Work in the doc's order, §2.1 through §2.7, because later tools depend on earlier ones. pnpm needs Node, `flutter config` needs Flutter, and `sdkmanager` needs a JDK. For each ❌ row, and each ⚠️ row the user chose to fix:

1. Say in one line what the tool is for, from the doc's usage line.
2. Give the doc's install command. Run user-space commands yourself: nvm, `npm install -g`, `git clone` into `~/development`, `flutter config`, `sdkmanager`, and edits to `~/.zshrc`. The rest go to the user (rules above).
3. Re-probe. The row is done when it turns ✅. When an install fails, check the doc's §8 troubleshooting table first.

Project libraries: install exactly what the manifests list, through `make <component>-setup`. The doc's §3 "planned" libraries arrive with the issues that need them.

Done when every row the user chose to fix is ✅.

## 5. Project setup and smoke test

Ask once for the whole step, listing every command it will run: each component's setup and check, and starting the backend.

For each component in scope:

1. Run `make <component>-setup`.
2. Run `make <component>-check`. It passes.

Then, for the backend:

1. Start `make backend` in the background.
2. Confirm `curl -fsS http://localhost:8090/api/health` answers.
3. Hand the user the superuser command from the doc's §4 to run. They choose the email and password.

For mobile:

1. Confirm `flutter doctor` shows ✓ for Flutter and the Android toolchain.
2. If the user has a phone, walk them through §6.1 (pairing) and §6.2 (networking). Then have them open `http://<pc-ip>:8090/api/health` in the phone's browser.

Stop every process you started.

Done when every in-scope component's `-check` passes and the backend health check answers.

## 6. Report

End with a table with one row per probed tool: tool, before, after, decision. Under it, list:

- what's still pending (phone, printer, rows marked "Later");
- every stale doc row, with the project file that disagrees.

Then re-probe ports 8090 and 5173 and the Watney processes (`pocketbase serve`, `vite`, `flutter run`, Gradle and Kotlin daemons). Close with **Running now**: one row per component still running, with its address, who started it (this session or the user), and how to stop it. When nothing is running, say so.

Offer to update the stale rows in `docs/local-development.md`. That edit is its own yes.
