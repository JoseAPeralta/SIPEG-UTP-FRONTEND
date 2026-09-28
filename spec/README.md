# Local Agent Harness

This directory contains the inputs and generated artifacts for the local agent harness. The
harness works on an isolated copy of the repository and must not access GitHub or any other Git
remote.

## Sources Of Truth

- `CONTEXT.md` defines the product mission and domain language.
- `AGENTS.md` defines repository and engineering rules.
- `spec/**/*-features.md` contains the human-authored requirements for one capability.
- `spec/**/*-spec.md` is generated from the corresponding features file.
- `spec/**/*-plan.md` is generated from the corresponding spec file.
- `spec/**/*-implementation-status.md` records local implementation progress.

Generated artifacts must not override `CONTEXT.md`, `AGENTS.md`, or their source features file.
Unknown requirements remain open questions instead of being invented.

## Traceability And Ownership

- Capability IDs in `docs/product/features.md` are immutable. Rename the capability description,
  not its ID; retire an ID without reusing it.
- Every capability has exactly one primary `*-features.md` owner. Supporting specs may add
  implementation context but must link back instead of redefining ownership.
- Product scope and implementation status are separate. Feature specs describe the intended
  behavior; status belongs in implementation status files and repository status documentation.
- API paths, payload fields, status values, response codes, and backend behavior must come from
  the current contract. Unknown details stay in `Open Questions`.

## Domain Index

- [Accounts](./accounts/accounts-features.md) (`ACC`)
- [Catalogs](./catalogs/catalogs-features.md) (`CAT`)
- [Users](./users/users-features.md) (`USR`)
- [Collaboration](./collaboration/collaboration-features.md) (`COL`)
- [Event programs](./event-programs/event-programs-features.md) (`EPG`)
- [Activities](./activities/activities-features.md) (`ACT`)
- [Speaker proposals](./speaker-proposals/speaker-proposals-features.md) (`SPP`)
- [Attendance](./attendance/attendance-features.md) (`ATT`)
- [Certificates](./certificates/certificates-features.md) (`CER`)
- [Alerts](./alerts/alerts-features.md) (`ALT`)
- [Notifications](./notifications/notifications-features.md) (`NTF`)
- [Reports](./reports/reports-features.md) (`RPT`)

Supporting implementation specs: [authentication and session](./auth/auth-features.md) and
[catalog and working context](./events/events-features.md).

## Local Workflow

1. A person creates or updates a `*-features.md` file.
2. The Feature Analyzer generates the sibling `*-spec.md` file.
3. The Plan Generator generates the sibling `*-plan.md` file.
4. A person reviews and approves the spec and plan.
5. The Implementation Agent works on an isolated local copy.
6. A person reviews the resulting local changes before integrating them.
7. A local commit is allowed only after an explicit user request.

## Repository Safety Policy

- Agents must not receive GitHub connectors, tokens, SSH keys, credential helpers, or MCP tools.
- Agents must not access, fetch, clone, pull, push, or otherwise communicate with a Git remote.
- Agent workspaces must not contain `.git`, `.env*`, private keys, dependency directories, build
  outputs (`dist/`, `storybook-static/`), test artifacts (`coverage/`, `test-results/`,
  `playwright-report/`, `*.tsbuildinfo`), editor metadata (`.DS_Store`), or local agent
  configuration.
- Agents must not run `git commit`. A trusted local operator may create a commit only after an
  explicit user request.
- A request to commit never authorizes a push or any other remote operation.
- Prompts are guidance only. Isolation must also be enforced by workspace and runtime controls.

Prepare an isolated copy with:

```bash
./scripts/prepare-agent-workspace.sh /tmp/sipeg-agent-workspace
```

The destination must be outside this repository and must not already exist.

Run a local command inside the isolated network and filesystem namespace with:

```bash
./scripts/run-agent-sandbox.sh /tmp/sipeg-agent-workspace -- <local-agent-command>
```

The runner requires Linux user, mount, network, and PID namespaces through `unshare`. It removes
the parent environment, creates private network and process namespaces, mounts only the prepared
workspace under a private `/mnt`, and hides host user directories, temporary files, runtime sockets,
and process information. The local agent runtime must already be available as a system executable
or inside the isolated workspace; the runner cannot download it.

Verify both isolation layers with:

```bash
pnpm run test:harness
```

## Continuous Integration

The `harness-isolation` job runs `pnpm run test:harness` on `ubuntu-latest`. The runner must allow
unprivileged user namespaces; the job enables them with
`sudo sysctl -w kernel.apparmor_restrict_unprivileged_userns=0`. If the runner blocks `unshare --user`,
run `pnpm run test:harness` locally before integrating. This check is mandatory and has no silent
exclusion (`continue-on-error`).
