---
title: "ADR-0010: Separate Public and Administrative Query Boundaries"
status: "Accepted"
date: "2026-09-26"
authors: "SIPEG-UTP Team"
tags: ["architecture", "decision", "server-state", "privacy", "caching"]
supersedes: ""
superseded_by: ""
---

# ADR-0010: Separate Public and Administrative Query Boundaries

## Status

**Accepted**

## Context

The public landing page and authenticated modules currently share one `activityCatalog` query key.
That key is also the only server-state key eligible for persistence in `localStorage`. Once
administrative requests carry a Bearer token, sharing the cache can expose draft, cancelled or
permission-scoped data to an anonymous view or persist it beyond logout.

## Decision

- Assign distinct query keys to the public and administrative activity catalogs.
- Persist only the public catalog key.
- Require catalog consumers to declare whether they need public or administrative data.
- Clear all in-memory and persisted queries on login, logout and identity changes.
- Add resource- and identity-scoped administrative keys as CRUD integrations are introduced.

## Consequences

### Positive

- **POS-001**: Public offline data cannot collide with authenticated catalog responses.
- **POS-002**: Privacy review remains explicit through `PERSISTED_QUERY_KEY_ROOTS`.
- **POS-003**: Administrative invalidation can evolve independently from public revalidation.

### Negative

- **NEG-001**: Public and administrative views may perform separate requests for similar data.
- **NEG-002**: Every new consumer must choose the correct query boundary explicitly.

## Alternatives Considered

### Keep One Shared Catalog Key

- **ALT-001**: **Description**: Reuse one cached catalog across anonymous and authenticated views.
- **ALT-002**: **Rejection Reason**: Cache identity and persistence would not reflect differences in
  authorization or publication status.

### Disable Persistence Entirely

- **ALT-003**: **Description**: Remove offline public catalog persistence.
- **ALT-004**: **Rejection Reason**: It avoids one risk but discards an intentional, bounded public
  PWA capability; separate keys provide the required boundary.

## Implementation Notes

- **IMP-001**: Name the roots `public-activity-catalog` and `administrative-activity-catalog`.
- **IMP-002**: Keep only `public-activity-catalog` in `PERSISTED_QUERY_KEY_ROOTS`.
- **IMP-003**: Tests prove that administrative data is never dehydrated.
- **IMP-004**: Backend publication rules must still be enforced; query separation is not an
  authorization mechanism.

## References

- **REF-001**: [ADR-0008](./adr-0008-tanstack-query-server-state.md)
- **REF-002**: [ADR-0009](./adr-0009-auth-session-token-storage.md)
- **REF-003**: `src/app/query/queryKeys.ts`
- **REF-004**: `src/app/query/queryPersistence.ts`
