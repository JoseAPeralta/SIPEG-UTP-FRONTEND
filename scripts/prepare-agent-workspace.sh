#!/bin/sh

set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
DEFAULT_SOURCE_ROOT=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd -P)
DESTINATION=${1:-}
SOURCE_ROOT=${2:-$DEFAULT_SOURCE_ROOT}

if [ -z "$DESTINATION" ]; then
  printf '%s\n' "Usage: $0 DESTINATION [SOURCE]" >&2
  exit 1
fi

if [ ! -d "$SOURCE_ROOT" ]; then
  printf '%s\n' "Source directory does not exist: $SOURCE_ROOT" >&2
  exit 1
fi

SOURCE_ROOT=$(CDPATH= cd -- "$SOURCE_ROOT" && pwd -P)
DESTINATION_PARENT=$(dirname -- "$DESTINATION")
DESTINATION_NAME=$(basename -- "$DESTINATION")

if [ ! -d "$DESTINATION_PARENT" ]; then
  printf '%s\n' "Destination parent does not exist: $DESTINATION_PARENT" >&2
  exit 1
fi

DESTINATION_PARENT=$(CDPATH= cd -- "$DESTINATION_PARENT" && pwd -P)
DESTINATION="$DESTINATION_PARENT/$DESTINATION_NAME"

if [ -e "$DESTINATION" ]; then
  printf '%s\n' "Destination already exists: $DESTINATION" >&2
  exit 1
fi

case "$DESTINATION" in
  "$SOURCE_ROOT" | "$SOURCE_ROOT"/*)
    printf '%s\n' "Destination must be outside the source repository" >&2
    exit 1
    ;;
esac

umask 077
mkdir "$DESTINATION"
ARCHIVE=$(mktemp "${TMPDIR:-/tmp}/sipeg-agent-workspace.XXXXXX")

cleanup_on_failure() {
  status=$?
  trap - 0 HUP INT TERM
  rm -f "$ARCHIVE"
  if [ "$status" -ne 0 ]; then
    rm -rf "$DESTINATION"
  fi
  exit "$status"
}

trap cleanup_on_failure 0
trap 'exit 1' HUP INT TERM

tar \
  --exclude='./.agents' \
  --exclude='./.agents/*' \
  --exclude='*/.agents' \
  --exclude='*/.agents/*' \
  --exclude='./.git' \
  --exclude='./.git/*' \
  --exclude='*/.git' \
  --exclude='*/.git/*' \
  --exclude='./.react-router' \
  --exclude='./.react-router/*' \
  --exclude='*/.react-router' \
  --exclude='*/.react-router/*' \
  --exclude='./coverage' \
  --exclude='./coverage/*' \
  --exclude='*/coverage' \
  --exclude='*/coverage/*' \
  --exclude='./dist' \
  --exclude='./dist/*' \
  --exclude='*/dist' \
  --exclude='*/dist/*' \
  --exclude='./node_modules' \
  --exclude='./node_modules/*' \
  --exclude='*/node_modules' \
  --exclude='*/node_modules/*' \
  --exclude='.env' \
  --exclude='.env.*' \
  --exclude='*/.env' \
  --exclude='*/.env.*' \
  --exclude='.npmrc' \
  --exclude='*/.npmrc' \
  --exclude='.yarnrc*' \
  --exclude='*/.yarnrc*' \
  --exclude='*.key' \
  --exclude='*.pem' \
  --exclude='*.p12' \
  --exclude='*.pfx' \
  -C "$SOURCE_ROOT" \
  -cf "$ARCHIVE" .

tar -C "$DESTINATION" -xf "$ARCHIVE"

cat > "$DESTINATION/.agent-sandbox" <<'EOF'
mode=local-only
remote_access=forbidden
git_metadata=absent
local_commits=explicit-user-request-only
remote_operations=forbidden
EOF

rm -f "$ARCHIVE"
trap - 0 HUP INT TERM

printf '%s\n' "Prepared isolated agent workspace: $DESTINATION"
