#!/usr/bin/env bash
# Boot PocketBase on a throwaway data dir with the committed migrations and hooks,
# and fail unless the health check answers.
set -euo pipefail

cd "$(dirname "$0")/.."
./scripts/install-pocketbase.sh > /dev/null

port="${PB_CHECK_PORT:-8091}"
data="$(mktemp -d)"
log="$data/serve.log"

./bin/pocketbase serve --http "127.0.0.1:$port" --dir "$data" \
  --migrationsDir pb_migrations --hooksDir pb_hooks > "$log" 2>&1 &
pid=$!
trap 'kill "$pid" 2> /dev/null || true; wait "$pid" 2> /dev/null || true; rm -rf "$data"' EXIT

for _ in $(seq 1 40); do
  if curl -fsS "http://127.0.0.1:$port/api/health" > /dev/null 2>&1; then
    echo "PocketBase started with the committed migrations and hooks."
    exit 0
  fi
  if ! kill -0 "$pid" 2> /dev/null; then break; fi
  sleep 0.25
done

echo "PocketBase failed to start:" >&2
cat "$log" >&2
exit 1
