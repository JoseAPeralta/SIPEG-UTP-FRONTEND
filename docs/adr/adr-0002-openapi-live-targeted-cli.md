---
title: "ADR-0002: Live OpenAPI Contract Through a Targeted CLI"
status: "Accepted"
date: "2026-09-25"
authors: "SIPEG-UTP Team"
tags: ["architecture", "decision", "openapi", "api-contract"]
supersedes: ""
superseded_by: ""
---

# ADR-0002: Live OpenAPI Contract Through a Targeted CLI

## Status

**Accepted**

## Context

The backend is a separate project and the authority for the HTTP contract. Frontend integration
work needs exact request fields, response fields, authentication requirements and status codes.
Loading the complete OpenAPI document, or a rendered documentation page, into an agent context is
expensive and noisy, and inventing fields produces broken integrations. Contract reads must stay on
the local machine.

## Decision

Provide `pnpm run api:contract`, backed by `scripts/query-api-contract.mjs`, with two commands:
`search <text>` and `get <METHOD> <PATH>`. The default source is the running backend at
`http://localhost:3000/api/openapi.json`; `--source` or `SIPEG_OPENAPI_SOURCE` override it with a
local document or a different loopback backend. For HTTP sources the CLI accepts only loopback hosts,
only the `/api/openapi.json` endpoint, and rejects credentials, query parameters and fragments. It
uses a 5-second timeout and a 5 MiB cap, resolves local `#/components` references, and prints only
the requested operation view. Agents must not fetch `/api/docs` or load the complete document into
model context. The backend stays read-only from this repository.

## Consequences

### Positive

- **POS-001**: Integration uses the real, current contract instead of a summary or memory.
- **POS-002**: Targeted queries keep model context small and focused.
- **POS-003**: Loopback-only sources prevent contract reads from leaving the machine.
- **POS-004**: Local OpenAPI documents keep the workflow usable offline.
- **POS-005**: No code generator means no mass churn for small contract changes.

### Negative

- **NEG-001**: The default workflow requires the backend running or a local document.
- **NEG-002**: Types are written and validated by hand; there is no generated client.
- **NEG-003**: The workflow depends on agents querying narrowly instead of pasting whole documents.
- **NEG-004**: The CLI must be extended if new reference shapes are needed.

## Alternatives Considered

### Load `/api/docs` or the complete OpenAPI document

- **ALT-001**: **Description**: Read the rendered docs or the full JSON whenever integration is needed.
- **ALT-002**: **Rejection Reason**: Floods the model context, hides the relevant operation and
  encourages summarizing rather than reading the contract.

### Generate a typed API client from OpenAPI

- **ALT-003**: **Description**: Add a code generation step that produces types and a client.
- **ALT-004**: **Rejection Reason**: Introduces a heavy toolchain, large generated diffs for small
  contract changes and an out-of-scope build dependency for this phase.

### Hand-write types from domain knowledge

- **ALT-005**: **Description**: Model requests and responses manually without consulting OpenAPI.
- **ALT-006**: **Rejection Reason**: Invents fields and drifts from the backend, producing broken
  integrations that tests cannot detect.

### Fetch the contract at runtime from the UI in development

- **ALT-007**: **Description**: Let the frontend query the live contract directly.
- **ALT-008**: **Rejection Reason**: Couples UI to transport, bypasses the adapters and adds no
  contract clarity.

## Implementation Notes

- **IMP-001**: Start the backend before querying, or pass a local OpenAPI document through `--source`.
- **IMP-002**: Treat OpenAPI as the source of truth and do not invent status codes or fields.
- **IMP-003**: Do not execute state-changing requests unless the user explicitly asks.
- **IMP-004**: Expand the CLI only when a concrete query need appears.

## References

- **REF-001**: [ADR-0001](./adr-0001-adapters-mock-api.md)
- **REF-002**: `AGENTS.md` (API Contract Workflow)
- **REF-003**: `scripts/query-api-contract.mjs`
