#!/usr/bin/env bash
# Boot PocketBase on a throwaway data dir with the committed migrations and hooks,
# then smoke-test staff login against it. Fails on the first broken step.
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

expect_status() {
  local want=$1 method=$2 path=$3 body=$4 got
  got="$(curl -s -o /dev/null -w '%{http_code}' -X "$method" "$base$path" \
    -H 'Content-Type: application/json' -d "$body")"
  if [[ "$got" != "$want" ]]; then
    echo "$method $path: expected HTTP $want, got $got" >&2
    exit 1
  fi
}

WATNEY_SEED_ADMIN_EMAIL=check@example.com WATNEY_SEED_ADMIN_PASSWORD=check-password \
  ./bin/pocketbase seed --dir "$data" --migrationsDir pb_migrations --hooksDir pb_hooks > /dev/null

login=/api/collections/users/auth-with-password
expect_status 200 POST "$login" '{"identity":"check@example.com","password":"check-password"}'
expect_status 400 POST "$login" '{"identity":"check@example.com","password":"wrong-password"}'
expect_status 403 POST /api/collections/users/records \
  '{"email":"signup@example.com","password":"signup-password","passwordConfirm":"signup-password","role":"admin"}'
echo "Seeded admin logs in; a wrong password and public sign-up are rejected."
