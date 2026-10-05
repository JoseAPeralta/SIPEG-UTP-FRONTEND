---
title: "ADR-0011: Strangler Migration From The Operations Aggregate"
status: "Accepted"
date: "2026-09-27"
authors: "SIPEG-UTP Team"
tags: ["architecture", "decision", "adapters", "migration"]
supersedes: ""
superseded_by: ""
---

# ADR-0011: Strangler Migration From The Operations Aggregate

## Status

**Accepted**

## Context

`OperationsAdapter` groups careers, users, speaker proposals, attendance, certificates and reports
in one read model. It provided a useful seam for the first mock screens, but its interface now
couples unrelated domains: one missing API contract makes the complete aggregate unavailable and a
new consumer deepens that coupling. Replacing every domain at once would create speculative ports
and a large migration with no independently verifiable checkpoints.

## Decision

- Keep `OperationsAdapter` as a frozen legacy aggregate while real contracts are introduced.
- Permit only the external consumers listed by the R7 fitness function; the allowlist may shrink but
  must not grow.
- Introduce a domain port only when that domain is integrated through a confirmed contract.
- Extract domains in this order: careers, users, speaker proposals, attendance, certificates and
  reports.
- Remove each field and consumer from the aggregate when its domain adapter is complete.
- Move dashboard composition to extracted domain queries as attendance and certificates migrate.
- Delete `OperationsAdapter`, `useOperations`, its query key and its concrete adapters after the
  external consumer list reaches zero.
- Do not create empty ports, partially hide aggregate fields, or combine API data with mock fallback
  while `VITE_DATA_SOURCE=api`.

## Consequences

### Positive

- **POS-001**: Every extraction has a bounded interface and can be tested independently.
- **POS-002**: R7 proves mechanically that legacy coupling only shrinks.
- **POS-003**: Failures and cache invalidation become local to one domain instead of the aggregate.

### Negative

- **NEG-001**: Domain adapters and the aggregate coexist temporarily.
- **NEG-002**: Dashboard and report composition may consume multiple queries during migration.
- **NEG-003**: The closed consumer list must be maintained in the same change as each extraction.

## Alternatives Considered

### Big-Bang Replacement

- **ALT-001**: **Description**: Replace the aggregate with all domain ports in one change.
- **ALT-002**: **Rejection Reason**: Several contracts remain unavailable and the migration could not
  be verified domain by domain.

### Pre-create Every Port

- **ALT-003**: **Description**: Add empty interfaces and unavailable adapters for future domains.
- **ALT-004**: **Rejection Reason**: Speculative interfaces expose no leverage and encode assumptions
  before OpenAPI confirms them.

### Hybrid API And Mock Aggregate

- **ALT-005**: **Description**: Fill missing API fields with mock data.
- **ALT-006**: **Rejection Reason**: A screen would present mixed authority and could conceal contract
  or authorization failures.

## Implementation Notes

- **IMP-001**: Careers migrate first because users depend on career labels; users migrate before
  certificates because certificate rows depend on participant identity.
- **IMP-002**: R5 restricts the HTTP client to adapters, with `ApiError` as the documented Query retry
  exception.
- **IMP-003**: R6 restricts direct `fetch` and `/api/v1` literals to HTTP/adapters and tests; the
  service worker has an exact direct-fetch exception and must not cache API requests.
- **IMP-004**: Page, component and cross-feature imports use public feature barrels.
- **IMP-005**: Removing an aggregate consumer also removes it from the R7 allowlist.

## References

- **REF-001**: [ADR-0001](./adr-0001-adapters-mock-api.md)
- **REF-002**: [ADR-0006](./adr-0006-api-first-data-source.md)
- **REF-003**: [ADR-0008](./adr-0008-tanstack-query-server-state.md)
- **REF-004**: `src/architecture.test.ts`
- **REF-005**: `src/app/adapters/contracts.ts`
