#!/bin/sh

set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
PROJECT_ROOT=$(CDPATH= cd -- "$SCRIPT_DIR/../.." && pwd)
TEST_ROOT=$(mktemp -d)
SOURCE_ROOT="$TEST_ROOT/source"
DESTINATION="$TEST_ROOT/workspace"
FAILED_SOURCE_ROOT="$TEST_ROOT/failed-source"
FAILED_DESTINATION="$TEST_ROOT/failed-workspace"

cleanup() {
  rm -rf "$TEST_ROOT"
}

trap cleanup EXIT HUP INT TERM

mkdir -p \
  "$SOURCE_ROOT/.agents" \
  "$SOURCE_ROOT/.git" \
  "$SOURCE_ROOT/.react-router" \
  "$SOURCE_ROOT/coverage" \
  "$SOURCE_ROOT/dist" \
  "$SOURCE_ROOT/node_modules" \
  "$SOURCE_ROOT/packages/app/.agents" \
  "$SOURCE_ROOT/packages/app/.git" \
  "$SOURCE_ROOT/packages/app/node_modules" \
  "$SOURCE_ROOT/spec/events" \
  "$SOURCE_ROOT/src"

printf '%s\n' "frontend source" > "$SOURCE_ROOT/src/main.tsx"
printf '%s\n' "feature source" > "$SOURCE_ROOT/spec/events/events-features.md"
printf '%s\n' "repository rules" > "$SOURCE_ROOT/AGENTS.md"
printf '%s\n' "git metadata" > "$SOURCE_ROOT/.git/config"
printf '%s\n' "secret" > "$SOURCE_ROOT/.env"
printf '%s\n' "secret" > "$SOURCE_ROOT/.env.local"
printf '%s\n' "registry token" > "$SOURCE_ROOT/.npmrc"
printf '%s\n' "private key" > "$SOURCE_ROOT/deploy.key"
printf '%s\n' "agent internals" > "$SOURCE_ROOT/.agents/private.md"
printf '%s\n' "generated" > "$SOURCE_ROOT/dist/index.html"
printf '%s\n' "nested agent internals" > "$SOURCE_ROOT/packages/app/.agents/private.md"
printf '%s\n' "nested git metadata" > "$SOURCE_ROOT/packages/app/.git/config"
printf '%s\n' "nested dependency" > "$SOURCE_ROOT/packages/app/node_modules/dependency.js"

"$PROJECT_ROOT/scripts/prepare-agent-workspace.sh" "$DESTINATION" "$SOURCE_ROOT"

test -f "$DESTINATION/src/main.tsx"
test -f "$DESTINATION/spec/events/events-features.md"
test -f "$DESTINATION/AGENTS.md"
test -f "$DESTINATION/.agent-sandbox"

test ! -e "$DESTINATION/.git"
test ! -e "$DESTINATION/.env"
test ! -e "$DESTINATION/.env.local"
test ! -e "$DESTINATION/.npmrc"
test ! -e "$DESTINATION/deploy.key"
test ! -e "$DESTINATION/.agents"
test ! -e "$DESTINATION/.react-router"
test ! -e "$DESTINATION/coverage"
test ! -e "$DESTINATION/dist"
test ! -e "$DESTINATION/node_modules"
test ! -e "$DESTINATION/packages/app/.agents"
test ! -e "$DESTINATION/packages/app/.git"
test ! -e "$DESTINATION/packages/app/node_modules"

grep -q '^remote_access=forbidden$' "$DESTINATION/.agent-sandbox"
grep -q '^git_metadata=absent$' "$DESTINATION/.agent-sandbox"

mkdir "$FAILED_SOURCE_ROOT"
printf '%s\n' "unreadable" > "$FAILED_SOURCE_ROOT/unreadable.txt"
chmod 000 "$FAILED_SOURCE_ROOT/unreadable.txt"

if "$PROJECT_ROOT/scripts/prepare-agent-workspace.sh" \
  "$FAILED_DESTINATION" \
  "$FAILED_SOURCE_ROOT" 2>/dev/null; then
  printf '%s\n' "workspace preparation reported success after a copy failure" >&2
  exit 1
fi

test ! -e "$FAILED_DESTINATION"
chmod 600 "$FAILED_SOURCE_ROOT/unreadable.txt"

printf '%s\n' "prepare-agent-workspace: isolation test passed"
