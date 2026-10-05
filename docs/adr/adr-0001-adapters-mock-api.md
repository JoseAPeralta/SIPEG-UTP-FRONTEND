---
title: "ADR-0001: Adapters Between Mock and API Behind a Single Composition Root"
status: "Accepted"
date: "2026-09-25"
authors: "SIPEG-UTP Team"
tags: ["architecture", "decision", "adapters", "data-source"]
supersedes: ""
superseded_by: ""
---

# ADR-0001: Adapters Between Mock and API Behind a Single Composition Root

## Status

**Accepted**

## Context

The frontend must run as a self-contained demo before the backend publishes every contract, while
staying ready for HTTP integration. UI components and hooks must not depend on transport details or
on demonstration data. Repository rules require UI separated from API request logic and restrict
mock imports to adapters and their tests. A single, auditable seam is needed to select the data
source.

## Decision

Define the frontend ports `ActivityCatalogAdapter` and `OperationsAdapter` in
`src/app/adapters/contracts.ts`. Concrete adapters live with each feature under
`features/*/adapters`. `createAppAdapters` in `src/app/adapters/createAppAdapters.ts` is the only
composition root and selects mock or API through `VITE_DATA_SOURCE` (`mock` by default).
`AppAdaptersProvider` and `useAppAdapters` expose the resolved adapters to hooks. With `api`,
operation domains whose contracts are not published yet return an explicit unavailable error. UI
code never imports `src/data/mock`; the architecture fitness test enforces it.

## Consequences

### Positive

- **POS-001**: The application runs and demos without a backend because the default source is mock.
- **POS-002**: Switching to the API is an environment change (`VITE_DATA_SOURCE=api`), not a code change.
- **POS-003**: Hooks and UI stay testable through provider injection and fake adapters.
- **POS-004**: There is one auditable place that decides where data comes from.
- **POS-005**: Mock isolation is mechanically enforced instead of relying on review.

### Negative

- **NEG-001**: Two adapter families (mock and API) must be maintained per domain.
- **NEG-002**: Mock and API payload shapes can drift until both are covered by tests.
- **NEG-003**: The `api` source is incomplete until the backend publishes all contracts.
- **NEG-004**: The adapter ports must grow explicitly as new domains are integrated.

## Alternatives Considered

### Direct fetch calls inside components or hooks

- **ALT-001**: **Description**: Call endpoints directly from UI code and fall back to local data inline.
- **ALT-002**: **Rejection Reason**: Couples UI to transport, makes tests network-dependent and
  violates the architecture guard on presentation separation.

### A global HTTP client imported by every feature

- **ALT-003**: **Description**: Export one shared client and import it wherever data is needed.
- **ALT-004**: **Rejection Reason**: Hides the dependency, removes the per-feature mock seam and
  makes source selection implicit.

### Passing adapters through props from pages

- **ALT-005**: **Description**: Instantiate adapters at route level and pass them down the tree.
- **ALT-006**: **Rejection Reason**: Produces prop drilling and spreads composition across the route
  tree instead of one composition root.

### One composition root per feature

- **ALT-007**: **Description**: Let each feature select its own data source independently.
- **ALT-008**: **Rejection Reason**: Duplicates selection logic and makes the data-source seam hard
  to audit.

## Implementation Notes

- **IMP-001**: Keep ports in `src/app/adapters/contracts.ts` and add a new port plus an unavailable
  adapter before integrating a new domain.
- **IMP-002**: HTTP adapters must follow the OpenAPI contract and validate payloads before exposing
  them.
- **IMP-003**: When an allowance changes, update `src/architecture.test.ts` together with the code.

## References

- **REF-001**: [ADR-0002](./adr-0002-openapi-live-targeted-cli.md)
- **REF-002**: `CONTEXT.md` (Adapters)
- **REF-003**: `README.md` (Origen De Datos)
- **REF-004**: `src/architecture.test.ts`
