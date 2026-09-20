#!/bin/sh

set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
PROJECT_ROOT=$(CDPATH= cd -- "$SCRIPT_DIR/../.." && pwd)
TEST_ROOT=$(mktemp -d)
WORKSPACE="$TEST_ROOT/workspace"
HOST_NETWORK_NAMESPACE=$(readlink /proc/self/ns/net)
HOST_ONLY_FILE="$TEST_ROOT/host-only.txt"

cleanup() {
  rm -rf "$TEST_ROOT"
}

trap cleanup EXIT HUP INT TERM

mkdir "$WORKSPACE"
cat > "$WORKSPACE/.agent-sandbox" <<'EOF'
mode=local-only
remote_access=forbidden
git_metadata=absent
remote_operations=forbidden
EOF
printf '%s\n' "must not be visible" > "$HOST_ONLY_FILE"

cat > "$WORKSPACE/sandbox-check.sh" <<EOF
#!/bin/sh

set -eu

test -z "\${GITHUB_TOKEN:-}"
test -z "\${GH_TOKEN:-}"
test -z "\${SSH_AUTH_SOCK:-}"
test ! -e "$PROJECT_ROOT"
test ! -e "$HOST_ONLY_FILE"
readlink /proc/self/ns/net > sandbox-network-namespace.txt
printf '%s\n' "sandbox command completed" > sandbox-result.txt
EOF

GITHUB_TOKEN="must-not-cross-boundary" \
GH_TOKEN="must-not-cross-boundary" \
SSH_AUTH_SOCK="/tmp/must-not-cross-boundary" \
  "$PROJECT_ROOT/scripts/run-agent-sandbox.sh" "$WORKSPACE" -- sh ./sandbox-check.sh

test -f "$WORKSPACE/sandbox-result.txt"
test "$(cat "$WORKSPACE/sandbox-result.txt")" = "sandbox command completed"
test "$(cat "$WORKSPACE/sandbox-network-namespace.txt")" != "$HOST_NETWORK_NAMESPACE"

mkdir "$WORKSPACE/.git"

if "$PROJECT_ROOT/scripts/run-agent-sandbox.sh" "$WORKSPACE" -- true 2>/dev/null; then
  printf '%s\n' "sandbox accepted a workspace containing .git" >&2
  exit 1
fi

rmdir "$WORKSPACE/.git"
cat > "$WORKSPACE/.agent-sandbox" <<'EOF'
mode=local-only
remote_access=allowed
git_metadata=absent
EOF

if "$PROJECT_ROOT/scripts/run-agent-sandbox.sh" "$WORKSPACE" -- true 2>/dev/null; then
  printf '%s\n' "sandbox accepted an invalid safety marker" >&2
  exit 1
fi

printf '%s\n' "run-agent-sandbox: isolation test passed"
