---
title: "ADR-0012: Explicit HTTP Authentication Policy"
status: "Accepted"
date: "2026-09-28"
authors: "SIPEG-UTP Team"
tags: ["architecture", "decision", "http", "authentication", "security"]
supersedes: ""
superseded_by: ""
---

# ADR-0012: Explicit HTTP Authentication Policy

## Status

**Accepted**

## Context

The HTTP client previously inferred authentication from an optional token reader and accepted a
manually supplied `Authorization` header. That made public and administrative behavior depend on
ambient session state. The activity catalog also shared one adapter method across both boundaries,
while private query keys did not identify the current user.

## Decision

- Require every `apiRequest` call to declare either `{ mode: "none" }` or
  `{ mode: "bearer", accessToken }`.
- Reject manual `Authorization` headers before network I/O. Only `apiClient` constructs Bearer
  headers, and bearer mode rejects a missing or blank token before network I/O.
- Keep environment, fetcher and request-neutral settings in public API adapter options. Inject the
  session token reader privately from the composition root.
- Resolve the token once per administrative catalog load. Public catalog and registration requests
  never read or send the session token.
- Scope administrative catalog and operations query keys by `userId`, never by token, and disable
  those queries when no authenticated user exists.
- Persist only successful public catalog queries. Prefix the persistence buster with an exported
  cache schema version.

## Consequences

### Positive

- **POS-001**: Authentication intent is visible and type-checked at every HTTP call site.
- **POS-002**: Public requests cannot accidentally inherit ambient credentials.
- **POS-003**: Private cache entries cannot cross authenticated identities or survive persistence.
- **POS-004**: Missing credentials and manual authorization fail before a request leaves the app.

### Negative

- **NEG-001**: Every adapter request must repeat an explicit authentication policy.
- **NEG-002**: Public and administrative catalog loads may duplicate otherwise similar requests.

## Alternatives Considered

### Optional Global Token Reader

- **ALT-001**: **Description**: Keep a token reader in generic API options and attach it whenever
  present.
- **ALT-002**: **Rejection Reason**: Public behavior would remain dependent on ambient session state.

### Adapter-Constructed Authorization Headers

- **ALT-003**: **Description**: Let each adapter build its own Bearer header.
- **ALT-004**: **Rejection Reason**: Validation and header construction would be duplicated and could
  bypass the centralized pre-fetch checks.

## Implementation Notes

- **IMP-001**: `ActivityCatalogAccess` is part of the app adapter contract.
- **IMP-002**: The mock catalog adapter returns a fresh deep copy for every access mode and load.
- **IMP-003**: Anonymous private hooks expose a guarded no-op refetch and React Query's actual
  `isLoading` state.
- **IMP-004**: Targeted OpenAPI verification of catalog GET operations was blocked because the live
  backend was unavailable. No endpoint, payload, response field, enum or status was changed or
  inferred.

## References

- **REF-001**: [ADR-0009](./adr-0009-auth-session-token-storage.md)
- **REF-002**: [ADR-0010](./adr-0010-public-administrative-query-boundaries.md)
- **REF-003**: `src/app/adapters/http/apiClient.ts`
- **REF-004**: `src/app/adapters/createAppAdapters.ts`
- **REF-005**: `src/app/query/queryKeys.ts`
- **REF-006**: `src/app/query/queryPersistence.ts`
