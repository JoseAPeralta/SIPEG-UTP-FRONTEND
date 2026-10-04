---
title: "ADR-0014: Dedicated Operation for User Scope Discovery"
status: "Accepted"
date: "2026-10-04"
authors: "SIPEG-UTP Team"
tags: ["architecture", "decision", "authorization", "collaboration", "api-contract"]
supersedes: ""
superseded_by: ""
---

# ADR-0014: Dedicated Operation for User Scope Discovery

## Status

**Accepted** — the backend published the operation as proposed and the frontend consumes it since
Fase 3.4. Update (2026-10-04): `NEG-001` and `NEG-002` are resolved; the context and decision below
stay as the original record.

## Context

- Collaboration grants give a user permissions on event programs and activities, so an authenticated
  collaborator needs to find every scope they can work on without knowing resource IDs in advance.
- The live contract only exposes `GET /api/v1/users/me/permissions?scope=program|activity&id=`
  (backend Fase 3.7), which answers for a scope the caller already knows.
- With a Bearer token, `GET /api/v1/event-programs` always returns ACTIVE programs to non-admin
  callers and `GET /api/v1/activities` always returns the public set (SCHEDULED, ONGOING and
  COMPLETED of active programs). A collaborator holding a grant on a DRAFT, CANCELLED or ARCHIVED
  scope cannot discover it through those listings.
- Querying own permissions once per public catalog item is a forbidden N+1 and remains incomplete for
  non-public scopes.
- Frontend rules forbid implementing operations that OpenAPI does not publish (ADR-0002) and mixing
  public and administrative boundaries (ADR-0010).
- The backend master plan covers delegation and own permissions in Fase 3 (3.1-3.10) and does not
  plan a global scope-discovery operation in any later phase.
- Fase 3.4 of the frontend roadmap requires agreeing that contract first; the recommended option is a
  dedicated contract.

## Decision

- Request one dedicated, paginated operation that returns every scope where the authenticated user
  holds at least one effective permission. The proposed shape is `GET /api/v1/users/me/scopes`.
- Do not implement a fallback that calls own permissions per resource, extends public listings, or
  invents administrative enumeration.
- Keep `/operaciones`, capability-based guards (Fase 3.5) and working-context selection (Fase 4.8)
  blocked until the operation is published in OpenAPI and implemented end to end.
- Once published, consume it through an adapter owned by `features/collaboration`, with an
  identity-scoped query key that is never persisted.

### Proposed Contract (subject to backend review)

**Operation:** `GET /api/v1/users/me/scopes`

- **Authentication:** `bearerAuth`; any authenticated account. No additional permission is required
  because a caller only reads their own scopes, same as `GET /users/me/permissions`.
- **Query parameters:** `type` optional `program | activity`; `page` integer >= 1 (default 1);
  `limit` integer 1..50 (default 20). Invalid values respond `400`.
- **Response:** standard envelope with paginated `items`, `page`, `limit`, `total` and `totalPages`.
- **Item shape:**

| Field                | Type                                  | Notes                                                                                                          |
| -------------------- | ------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `type`               | `"program" \| "activity"`             | Scope kind the grant applies to.                                                                               |
| `id`, `name`         | `string`                              | Scope identity and display name.                                                                               |
| `status`             | `string`                              | Program: `DRAFT/ACTIVE/COMPLETED/CANCELLED/ARCHIVED`. Activity: `DRAFT/SCHEDULED/ONGOING/COMPLETED/CANCELLED`. |
| `eventProgram`       | `{ id, name, label, status } \| null` | Parent program for activities; `null` for programs.                                                            |
| `organizationalUnit` | `{ id, name, type }`                  | Owning unit.                                                                                                   |
| `permissions`        | `OwnPermission[]`                     | Same element as `GET /users/me/permissions`: `{ name, origin, validFrom, validUntil }`.                        |

- **Semantics:** an item appears only when at least one effective permission is active at request
  time; expired or future grants are ignored, consistent with `GET /users/me/permissions`. Scopes in
  non-public states are included, which is the purpose of the operation. A user without grants
  receives an empty page, not a `404`. Ordering must be deterministic; `name ASC, id ASC` is the
  proposal.
- **ADMIN behavior (pending backend confirmation):** the recommendation is the whole catalog as
  `LOCAL` with unbounded envelopes, paginated, consistent with `GET /users/me/permissions`.
- **Errors:** `400` invalid query, `401` missing or invalid token, `403` inactive account.
- **Privacy:** no `grantedById`, `grantedAt`, emails or audit fields; the response is private and the
  client must not persist it.

## Consequences

### Positive

- **POS-001**: One paginated request discovers every accessible scope, including non-public states.
- **POS-002**: Capability-based navigation (Fase 3.5) and the working context (Fase 4.8) become
  implementable without guessing.
- **POS-003**: Public and administrative boundaries stay intact (ADR-0010) and the activity catalog
  fan-out is not reintroduced (ADR-0005).

### Negative

- **NEG-001**: Fase 3.4 stays blocked until the backend publishes the operation; the frontend cannot
  close it on its own.
- **NEG-002**: The operations area and effective-capability guards remain unavailable in the meantime.

## Alternatives Considered

### Own Permissions N+1

- **ALT-001**: **Description**: iterate the public program list and call
  `GET /users/me/permissions` per item.
- **ALT-002**: **Rejection Reason**: forbidden by the roadmap; stale and incomplete because draft and
  archived scopes never appear in the public listing.

### Extend Public Listings

- **ALT-003**: **Description**: make `GET /event-programs` and `GET /activities` return accessible
  non-public items when a Bearer token is present.
- **ALT-004**: **Rejection Reason**: contaminates the public contract and cache boundary (ADR-0010)
  and still forces a per-item permission request to know which items are actionable.

### Enumerate Administrative Listings

- **ALT-005**: **Description**: reuse `status=ALL` administrative listings to infer scopes.
- **ALT-006**: **Rejection Reason**: those listings are ADMIN-only and global; they do not express
  horizontal scope.

## Implementation Notes

- **IMP-001**: Keep the future adapter inside `features/collaboration` and reserve the endpoint to
  that feature in the architecture fitness functions.
- **IMP-002**: Scope the query key by identity (`userScopes(userId)`) and do not add it to
  `PERSISTED_QUERY_KEY_ROOTS`.
- **IMP-003**: Collaboration and permission mutations must invalidate the scopes key; identity
  changes already reset the query client.
- **IMP-004**: Never derive authorization from the list: a backend `403` remains authoritative for
  every action.
- **IMP-005**: The published contract uses a single merged `status` enum (`DRAFT`, `ACTIVE`,
  `COMPLETED`, `CANCELLED`, `ARCHIVED`, `SCHEDULED`, `ONGOING`); the mapper validates it as one enum.
- **IMP-006**: `GET /api/v1/users/me/scopes` is reserved to `src/features/collaboration/adapters/` by
  the R8 fitness function, and `api:mocks-check` tracks the `UserScope` and `OwnPermission` schemas.

## References

- **REF-001**: [ADR-0002](./adr-0002-openapi-live-targeted-cli.md)
- **REF-002**: [ADR-0010](./adr-0010-public-administrative-query-boundaries.md)
- **REF-003**: [ADR-0011](./adr-0011-domain-adapter-strangler-migration.md)
- **REF-004**: `spec/collaboration/collaboration-features.md` (`COL-002`)
- **REF-005**: Backend master plan Fase 3.7, `GET /api/v1/users/me/permissions`
- **REF-006**: `docs/superpowers/plans/2026-10-04-fase-3.4-descubrimiento-scopes.md`
