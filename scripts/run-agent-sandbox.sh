#!/bin/sh

set -eu

WORKSPACE=${1:-}

if [ -z "$WORKSPACE" ]; then
  printf '%s\n' "Usage: $0 WORKSPACE -- COMMAND [ARGUMENTS...]" >&2
  exit 1
fi

shift

if [ "${1:-}" = "--" ]; then
  shift
fi

if [ "$#" -eq 0 ]; then
  printf '%s\n' "A command is required" >&2
  exit 1
fi

if [ ! -d "$WORKSPACE" ]; then
  printf '%s\n' "Workspace does not exist: $WORKSPACE" >&2
  exit 1
fi

WORKSPACE=$(CDPATH= cd -- "$WORKSPACE" && pwd -P)

if [ ! -f "$WORKSPACE/.agent-sandbox" ]; then
  printf '%s\n' "Workspace was not created by prepare-agent-workspace.sh" >&2
  exit 1
fi

for required_marker in \
  'mode=local-only' \
  'remote_access=forbidden' \
  'git_metadata=absent' \
  'remote_operations=forbidden'; do
  if ! grep -Fqx "$required_marker" "$WORKSPACE/.agent-sandbox"; then
    printf '%s\n' "Workspace has an invalid safety marker" >&2
    exit 1
  fi
done

if [ -e "$WORKSPACE/.git" ] || [ -L "$WORKSPACE/.git" ]; then
  printf '%s\n' "Refusing to run with Git metadata in the workspace" >&2
  exit 1
fi

unshare --user --map-root-user --mount --net --pid --fork sh -c '
  set -eu

  workspace=$1
  command_path=$2
  shift 2

  mount --make-rprivate /

  mount -t tmpfs -o mode=700,nosuid,nodev tmpfs /mnt
  mkdir /mnt/workspace
  mount --bind "$workspace" /mnt/workspace

  for private_directory in /home /root /media /run /tmp; do
    if [ -d "$private_directory" ]; then
      mount -t tmpfs -o mode=700,nosuid,nodev tmpfs "$private_directory"
    fi
  done

  mount -t proc proc /proc

  sandbox_home=/tmp/agent-home
  mkdir -p "$sandbox_home"
  cd /mnt/workspace

  exec env -i \
    AGENT_HARNESS_MODE=local-only \
    HOME="$sandbox_home" \
    LANG=C.UTF-8 \
    LC_ALL=C.UTF-8 \
    PATH="$command_path" \
    "$@"
' agent-sandbox "$WORKSPACE" "$PATH" "$@"
