# API Contract Agent Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Nota de vigencia (2026-09-25):** plan histórico. Hoy la fuente por defecto del CLI es el backend vivo (`http://localhost:3000/api/openapi.json`) y el documento local es un override; los tests viven colocados en `scripts/query-api-contract.test.mjs`, no en `scripts/__tests__/`. Ver `ADR-0002`.

**Goal:** Allow agents to consult only the required OpenAPI operations with low token usage and without enabling API request execution from the frontend workspace.

**Architecture:** A dependency-free local CLI reads the versioned OpenAPI document by default and can explicitly query the live document. A project skill and OpenCode reference direct agents to the CLI, while Bruno remains a secondary source for concrete examples and test flows.

**Tech Stack:** Node.js 24, ECMAScript modules, Vitest, OpenAPI 3.1, OpenCode project configuration.

---

### Task 1: OpenAPI Query Behavior

**Files:**

- Create: `scripts/__tests__/query-api-contract.test.mjs`
- Create: `scripts/query-api-contract.mjs`

- [x] Write failing tests for operation search, exact operation selection, path parameters, transitive component references, security schemes, circular references, local/remote sources, argument parsing and errors.
- [x] Run `pnpm exec vitest run scripts/__tests__/query-api-contract.test.mjs` and verify the missing implementation causes the expected failure.
- [x] Implement the minimal dependency-free CLI and exported functions required by the tests.
- [x] Re-run the focused test until it passes.

### Task 2: Project Command

**Files:**

- Modify: `package.json`

- [x] Add `api:contract` as `node scripts/query-api-contract.mjs`.
- [x] Verify `search`, compact `get`, pretty `get`, local source override and live source override.

### Task 3: OpenCode Integration

**Files:**

- Create: `opencode.json`
- Create: `.opencode/skills/api-contract/SKILL.md`

- [x] Register `../SIPEG-UTP-BACKEND` as the `backend-api` local reference.
- [x] Add a narrowly triggered skill that requires targeted CLI queries, treats Bruno as secondary, avoids Scalar HTML and prohibits mutating requests without explicit approval.
- [x] Do not register Bruno MCP or any other request-execution tool in the frontend.

### Task 4: Working Agreement And Usage

**Files:**

- Modify: `AGENTS.md`
- Modify: `README.md`

- [x] Document source precedence, the targeted-query workflow, frontend/backend boundaries and runtime comparison behavior.
- [x] Document human-readable command examples and source overrides.

### Task 5: Verification

- [x] Run the focused extractor test.
- [x] Run representative local and live queries.
- [x] Run `pnpm run test:harness`.
- [x] Run `pnpm run format:check`.
- [x] Run `pnpm run lint`.
- [x] Run `pnpm test`.
- [x] Run `pnpm run build`.
- [x] Verify in a fresh OpenCode process that the configuration resolves and the skill is discovered.

### Task 6: Hardening After Review

- [x] Report effective security requirements and the most specific `servers` in the operation view.
- [x] Resolve local path-item references and reject external or unsupported references explicitly.
- [x] Reject blank searches and incomplete `--source` values.
- [x] Restrict HTTP sources to loopback `/api/openapi.json` with redirects disabled, a timeout and a streamed 5 MiB limit.
- [x] Deny `edit` and matching `bash` commands against `../SIPEG-UTP-BACKEND` in `opencode.json`.
- [x] Cover the CLI boundary, environment source precedence and stderr failures in tests.
- [x] Align README statements about the existing backend and add `api:contract` to the scripts table.
