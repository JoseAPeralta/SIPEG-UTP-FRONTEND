---
title: "ADR-0003: Local Harness Isolation with Workspace and Runtime Boundaries"
status: "Accepted"
date: "2026-09-25"
authors: "SIPEG-UTP Team"
tags: ["architecture", "decision", "harness", "isolation", "security"]
supersedes: ""
superseded_by: ""
---

# ADR-0003: Local Harness Isolation with Workspace and Runtime Boundaries

## Status

**Accepted**

## Context

The local agent harness runs implementation agents against a copy of the repository. Prompts alone
are guidance, not enforcement, and the repository contains Git metadata, local agent configuration,
environment files, dependency directories and key material that must not reach an agent. Agents must
not access a Git remote, must not run Git commands and must not read host files outside their
workspace. These constraints need workspace and runtime controls that can be verified mechanically.

## Decision

`scripts/prepare-agent-workspace.sh` copies the repository to a destination outside the repository
using a tar archive that excludes `.git`, `.agents`, `.react-router`, `coverage`, `dist`,
`node_modules`, `.env*`, `.npmrc`, `.yarnrc*` and key material (`*.key`, `*.pem`, `*.p12`, `*.pfx`),
then writes a `.agent-sandbox` marker with the safety policy.
`scripts/run-agent-sandbox.sh` requires that marker, refuses to run when `.git` exists, and executes
the command through `unshare --user --map-root-user --mount --net --pid --fork` with a stripped
environment (`env -i`), tmpfs over `/home`, `/root`, `/media`, `/run` and `/tmp`, and only the
workspace bind-mounted at `/mnt/workspace`. `pnpm run test:harness` verifies both layers, and the
`harness-isolation` CI job runs it. If the runner cannot create unprivileged user namespaces, the
local run is mandatory before integration.

## Consequences

### Positive

- **POS-001**: Network, host filesystem and process visibility are bounded by kernel namespaces.
- **POS-002**: The prepared workspace carries no Git metadata, credentials or build outputs.
- **POS-003**: The marker makes accidental reuse of an unprepared directory fail fast.
- **POS-004**: Both layers are covered by shell tests that also run in CI.
- **POS-005**: The frontend repository is never mutated by test fixtures.

### Negative

- **NEG-001**: The runtime requires Linux user, mount, network and PID namespaces.
- **NEG-002**: GitHub runners may need `kernel.apparmor_restrict_unprivileged_userns=0`.
- **NEG-003**: Namespaces share the host kernel, so this is not a hypervisor boundary.
- **NEG-004**: The agent runtime must exist in the workspace or as a system executable.

## Alternatives Considered

### Rely on prompts and repository rules

- **ALT-001**: **Description**: Instruct agents not to touch Git, remotes or secrets.
- **ALT-002**: **Rejection Reason**: Guidance cannot enforce isolation and fails silently when an
  agent ignores it.

### Run each agent in a Docker container or virtual machine

- **ALT-003**: **Description**: Use a privileged container or VM as the agent boundary.
- **ALT-004**: **Rejection Reason**: Stronger isolation but requires a daemon or privileges, is
  heavier and is unavailable in every environment; kept as a fallback only.

### Prepare the workspace with `git worktree`

- **ALT-005**: **Description**: Create a linked worktree for the agent.
- **ALT-006**: **Rejection Reason**: Keeps `.git` metadata and remote access reachable, defeating the
  policy.

### Use a plain `chroot`

- **ALT-007**: **Description**: Change the filesystem root for agent commands.
- **ALT-008**: **Rejection Reason**: Requires root and does not isolate network or processes.

### Run agents directly in the working repository

- **ALT-009**: **Description**: Skip the copy and run locally with prompts.
- **ALT-010**: **Rejection Reason**: Exposes secrets, Git metadata and the operator environment.

## Implementation Notes

- **IMP-001**: The destination must be outside the repository and must not already exist.
- **IMP-002**: Keep `pnpm run test:harness` green when changing harness scripts.
- **IMP-003**: Do not add GitHub connectors, tokens, SSH credentials, MCP servers or remote tools to
  agent runs.
- **IMP-004**: When CI cannot create user namespaces, run `pnpm run test:harness` locally before
  integrating.
- **IMP-005**: The repository `opencode.json` pre-approves read-only Git queries for normal sessions.
  That allowance does not weaken this decision: a harness workspace has no Git metadata, so a read-only
  query cannot resolve a repository there and `run-agent-sandbox.sh` still refuses a workspace that has
  one.

## References

- **REF-001**: `spec/README.md`
- **REF-002**: `harness/README.md`
- **REF-003**: `AGENTS.md` (Local Harness Safety)
- **REF-004**: `.github/workflows/ci.yml`
