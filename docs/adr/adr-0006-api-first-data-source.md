---
title: "ADR-0006: API-First Data Source in Development"
status: "Accepted"
date: "2026-09-25"
authors: "SIPEG-UTP Team"
tags: ["architecture", "decision", "adapters", "openapi", "mocks", "testing"]
supersedes: ""
superseded_by: ""
---

# ADR-0006: API-First Data Source in Development

## Status

**Accepted**

## Context

The composition root (`src/app/adapters/createAppAdapters.ts`) selected mocks by default and the
API only through `VITE_DATA_SOURCE=api`. Development therefore exercised generated mock data that
drifts from the real backend: field renames, enum changes and new endpoints could go unnoticed
until integration, and UI behavior differed from production.

The live OpenAPI contract already publishes organizational units, event programs, activities,
classrooms and careers, and the operations consumed by the catalog adapter are public. Attendance,
certificates, speakers and reports still have no backend contract; the API composition keeps them
unavailable with an explicit Spanish error.

Feature teams also need a repeatable way to keep `src/data/mock` aligned with the contract when
OpenAPI changes, because mocks remain the deterministic fixture for tests and Storybook.

## Decision

Use the real API as the development data source and reserve mocks for automated tests, Storybook
and explicit offline work:

- `resolveDataSource` defaults to `api`; only `VITE_DATA_SOURCE=mock` selects the mock adapters.
- `src/test/render.tsx` and `.storybook/preview.tsx` keep passing `{ source: "mock" }` explicitly,
  so tests and visual baselines stay deterministic and never require the backend.
- `pnpm run dev` requires the backend at `http://localhost:3000`; when it is unreachable, the UI
  shows a Spanish connection error with a retry action.
- Modules whose contracts are still pending keep their explicit Spanish "contract pending" error
  instead of silently falling back to mocks.
- Any OpenAPI change must update `src/types/domain.ts`, the feature mappers, `src/data/mock` and
  the related tests in the same change. `pnpm run api:mocks-check` (which reads the live contract)
  reports drift; pure mock contract tests run in CI.

This ADR amends the default source recorded in ADR-0001. ADR-0001 remains authoritative for the
ports, the single composition root and the mock/API adapter split.

## Consequences

### Positive

- **POS-001**: Development exercises the real payloads, enums and pagination behavior.
- **POS-002**: Contract drift is detected early, either by the app failing loudly or by
  `api:mocks-check` before merge.
- **POS-003**: Tests and Storybook remain deterministic and backend-independent through explicit
  mock injection.
- **POS-004**: No new runtime dependency or generated client is introduced.

### Negative

- **NEG-001**: Developers must run the backend to use the app; offline work requires the explicit
  mock override.
- **NEG-002**: Attendance, certificates, speakers and reports stay degraded until the backend
  publishes their contracts.
- **NEG-003**: `api:mocks-check` runs against a live backend, so it cannot gate CI; only the pure
  mock tests can.

## Alternatives Considered

### Keep mocks as the development default

- **ALT-001**: **Description**: Leave `mock` by default and opt into the API per environment.
- **ALT-002**: **Rejection Reason**: Development keeps diverging from the real contract and the
  integration risk stays hidden until late.

### Per-resource hybrid fallback

- **ALT-003**: **Description**: Use the API where a contract exists and mock the pending
  operations automatically.
- **ALT-004**: **Rejection Reason**: Silently mixes real and fake data, hides missing backend
  contracts and contradicts "mocks only for tests".

### Generated mocks from OpenAPI (for example MSW or a codegen client)

- **ALT-005**: **Description**: Derive fixtures and handlers mechanically from the contract.
- **ALT-006**: **Rejection Reason**: Adds tooling and a generation pipeline; the current hand-kept
  mocks plus `api:mocks-check` cover the need without new dependencies.

## Implementation Notes

- **IMP-001**: `scripts/check-mock-contract.mjs` reuses `loadOpenApi` and `createOperationView`
  from `scripts/query-api-contract.mjs` and only reads loopback contracts.
- **IMP-002**: A drift report must name the missing field or enum and instruct updating domain,
  mappers, mocks and tests.
- **IMP-003**: Success criteria: catalog pages work against the live backend, tests/Storybook run
  without it, and a contract change makes `api:mocks-check` fail until mocks are updated.

## References

- **REF-001**: `docs/adr/adr-0001-adapters-mock-api.md`
- **REF-002**: `docs/adr/adr-0002-openapi-live-targeted-cli.md`
- **REF-003**: `README.md` (Origen De Datos)
- **REF-004**: `scripts/query-api-contract.mjs`, `scripts/check-mock-contract.mjs`
- **REF-005**: `src/data/mock/contract.test.ts`
