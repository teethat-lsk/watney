#!/usr/bin/env bash
# Boot PocketBase on a throwaway data dir with the committed migrations and hooks,
# check that the seed command's admin can log in, then run the API tests in tests/
# (access rules and hooks) against it. Fails on the first broken step.
set -euo pipefail

cd "$(dirname "$0")/.."
./scripts/install-pocketbase.sh > /dev/null

port="${PB_CHECK_PORT:-8091}"
base="http://127.0.0.1:$port"
data="$(mktemp -d)"
log="$data/serve.log"

./bin/pocketbase serve --http "127.0.0.1:$port" --dir "$data" \
  --migrationsDir pb_migrations --hooksDir pb_hooks > "$log" 2>&1 &
pid=$!
trap 'kill "$pid" 2> /dev/null || true; wait "$pid" 2> /dev/null || true; rm -rf "$data"' EXIT

for _ in $(seq 1 40); do
  if curl -fsS "$base/api/health" > /dev/null 2>&1; then break; fi
  if ! kill -0 "$pid" 2> /dev/null; then break; fi
  sleep 0.25
done
if ! curl -fsS "$base/api/health" > /dev/null 2>&1; then
  echo "PocketBase failed to start:" >&2
  cat "$log" >&2
  exit 1
fi
echo "PocketBase started with the committed migrations and hooks."

WATNEY_SEED_ADMIN_EMAIL=check@example.com WATNEY_SEED_ADMIN_PASSWORD=check-password \
  ./bin/pocketbase seed --dir "$data" --migrationsDir pb_migrations --hooksDir pb_hooks > /dev/null
status="$(curl -s -o /dev/null -w '%{http_code}' -X POST "$base/api/collections/users/auth-with-password" \
  -H 'Content-Type: application/json' -d '{"identity":"check@example.com","password":"check-password"}')"
if [[ "$status" != 200 ]]; then
  echo "The seeded admin can't log in: HTTP $status" >&2
  exit 1
fi
echo "The seeded admin logs in."

# The API tests save their fixtures into the same data dir and call the server over HTTP.
./bin/pocketbase api-tests "$base" --dir "$data" --hooksDir tests 2>&1 | sed -E 's/^[0-9\/]+ [0-9:]+ //'
