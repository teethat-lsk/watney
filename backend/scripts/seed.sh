#!/usr/bin/env bash
# Create or update the first admin staff user for local development.
# Credentials come from backend/.env (git-ignored); copy .env.example to start.
# Set PB_DIR to seed another data dir (default: pb_data).
set -euo pipefail

cd "$(dirname "$0")/.."

if [[ ! -f .env ]]; then
  echo "Missing backend/.env. Copy .env.example to .env and fill it in." >&2
  exit 1
fi
set -a
# shellcheck source=/dev/null
source .env
set +a

if [[ -z "${WATNEY_SEED_ADMIN_EMAIL:-}" || -z "${WATNEY_SEED_ADMIN_PASSWORD:-}" ]]; then
  echo "Set WATNEY_SEED_ADMIN_EMAIL and WATNEY_SEED_ADMIN_PASSWORD in backend/.env." >&2
  exit 1
fi

./scripts/install-pocketbase.sh > /dev/null

dir="${PB_DIR:-pb_data}"
# The seed command doesn't apply migrations itself, and it needs the staff role field.
./bin/pocketbase migrate up --dir "$dir" --migrationsDir pb_migrations > /dev/null
./bin/pocketbase seed --dir "$dir" --migrationsDir pb_migrations --hooksDir pb_hooks
