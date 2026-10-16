#!/usr/bin/env bash
# Download the pinned PocketBase binary (see ../.pocketbase-version) into backend/bin/
# and verify it against the release checksums.
set -euo pipefail

backend_dir="$(cd "$(dirname "$0")/.." && pwd)"
version="$(tr -d '[:space:]' < "$backend_dir/.pocketbase-version")"
bin_dir="$backend_dir/bin"

if [[ -x "$bin_dir/pocketbase" ]] && "$bin_dir/pocketbase" --version | grep -q "$version"; then
  echo "PocketBase $version already installed."
  exit 0
fi

case "$(uname -s)" in
  Linux) os=linux ;;
  Darwin) os=darwin ;;
  *) echo "Unsupported OS: $(uname -s)" >&2; exit 1 ;;
esac
case "$(uname -m)" in
  x86_64 | amd64) arch=amd64 ;;
  aarch64 | arm64) arch=arm64 ;;
  *) echo "Unsupported architecture: $(uname -m)" >&2; exit 1 ;;
esac

asset="pocketbase_${version}_${os}_${arch}.zip"
base_url="https://github.com/pocketbase/pocketbase/releases/download/v${version}"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

echo "Downloading $asset ..."
curl -fsSL -o "$tmp/$asset" "$base_url/$asset"
curl -fsSL -o "$tmp/checksums.txt" "$base_url/checksums.txt"
(cd "$tmp" && grep " $asset\$" checksums.txt | sha256sum -c -)

mkdir -p "$bin_dir"
unzip -o -q "$tmp/$asset" pocketbase -d "$bin_dir"
chmod +x "$bin_dir/pocketbase"
"$bin_dir/pocketbase" --version
