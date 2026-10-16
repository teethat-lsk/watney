#!/usr/bin/env bash
# Start the local PocketBase on all network interfaces so emulators and phones can reach it.
# Extra arguments are passed through to `pocketbase serve`.
set -euo pipefail

cd "$(dirname "$0")/.."
./scripts/install-pocketbase.sh > /dev/null

exec ./bin/pocketbase serve \
  --http "${PB_HTTP:-0.0.0.0:8090}" \
  --dir pb_data \
  --migrationsDir pb_migrations \
  --hooksDir pb_hooks \
  "$@"
