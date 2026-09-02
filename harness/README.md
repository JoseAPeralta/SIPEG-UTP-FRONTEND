# Local Harness

This harness implements a local, human-gated `Features -> Spec -> Plan -> Implementation` workflow.
It does not use the Harness AI Worker Agent pipeline because that example depends on remote pull
request context and remote commits.

## Non-Negotiable Controls

- Work only inside a workspace created by `scripts/prepare-agent-workspace.sh`.
- Run agent commands through `scripts/run-agent-sandbox.sh`.
- Do not configure GitHub connectors, GitHub Apps, personal access tokens, SSH credentials, MCP
  servers, credential helpers, or remote repository tools.
- Do not execute Git commands or access a Git remote.
- Do not read files outside the isolated workspace.
- Do not create commits. A trusted local operator may commit after an explicit user request.
- Never interpret a local commit request as permission to push or perform another remote action.

Prompts provide behavioral guidance. The preparation and sandbox scripts provide the enforceable
workspace, environment, filesystem, and network controls.

## Agent Sequence

1. `agents/feature-analyzer.md` reads one human-authored `*-features.md` file and writes its sibling
   `*-spec.md` file with `Draft` status.
2. A person reviews the generated spec and changes its status to `Approved`.
3. `agents/plan-generator.md` reads the approved spec and writes its sibling `*-plan.md` file with
   `Draft` status.
4. A person reviews the generated plan and changes its status to `Approved`.
5. `agents/implementation.md` implements at most three eligible tasks in the isolated workspace and
   updates the sibling `*-implementation-status.md` file.
6. A person reviews the local changes and decides whether to integrate them into the primary local
   workspace.

## Runtime Contract

The repository intentionally does not select or download an agent runtime. The chosen local runtime
must accept the relevant prompt and task input as local files or command arguments, and must be able
to run without network access. It must not require credentials from the host environment.

Example sandbox invocation shape:

```bash
./scripts/run-agent-sandbox.sh /tmp/sipeg-agent-workspace -- \
  <local-agent-command> < harness/agents/feature-analyzer.md
```

The exact command depends on the local model runtime selected by the operator.
