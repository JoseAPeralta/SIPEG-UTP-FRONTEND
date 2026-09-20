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
  outputs, coverage reports, or local agent configuration.
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
