#!/bin/sh
set -eu

LOCKFILE_HASH_FILE="node_modules/.package-lock.hash"
CURRENT_HASH="$(sha256sum package-lock.json | awk '{ print $1 }')"

if [ ! -d node_modules ] || [ ! -f "$LOCKFILE_HASH_FILE" ] || [ "$(cat "$LOCKFILE_HASH_FILE")" != "$CURRENT_HASH" ]; then
  echo "Syncing frontend dependencies with package-lock.json..."
  npm ci
  printf '%s' "$CURRENT_HASH" > "$LOCKFILE_HASH_FILE"
fi

exec "$@"