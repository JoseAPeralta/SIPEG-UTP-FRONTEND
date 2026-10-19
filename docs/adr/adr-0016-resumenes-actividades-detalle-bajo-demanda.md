---
title: "ADR-0016: Activity summaries from list operations with detail on demand"
status: "Accepted"
date: "2026-10-08"
authors: "SIPEG-UTP Team"
tags: ["architecture", "decision", "activities", "openapi", "adapters", "performance"]
supersedes: "ADR-0005"
superseded_by: ""
---

# ADR-0016: Activity summaries from list operations with detail on demand

## Status

**Accepted**

## Context

ADR-0005 kept the per-activity detail fan-out in `apiActivityCatalogAdapter.loadCatalog` because
only `ActivityDetail` exposes `equipment`, `enrolledCount`, `checkedInCount` and `cancelReason`,
and the first composite catalog consumers displayed those fields in cards, summaries and metrics.

Since then the readerships were split and the cost of the fan-out stopped being justified:

- The public agenda resolves the whole listing from `GET /api/v1/activities` with its own read model
  (`PublicActivityCatalogAdapter`), which never needed the detail fields.
- The administrative program listing (`GET /api/v1/event-programs/{id}/activities`) powers
  `ProgramActivitiesView` with server-side pagination and its own `AdministrativeActivityListItem`
  that deliberately omits the detail fields.
- Administrative and public details are opened per activity through `useAdministrativeActivityDetail`
  and `usePublicActivityDetail`, each with its own identity-scoped or anonymous key.

The remaining fan-out lived only in the composite catalog, where the cards of the dashboard, the
administrative catalog and the working-context selector are built. Loading `N` activities cost `N`
detail requests, a cost that grows linearly and contradicts the 5.9 target: loading the catalog must
not produce an extra request per activity.

## Decision

1. `ActivityCatalog.activities` is `ActivitySummary[]`, an `Omit` of `Activity` without
   `cancelReason`, `checkedInCount`, `enrolledCount` and `equipment`.
2. `apiActivityCatalogAdapter` reads only the paginated program listings and projects every
   `EventProgramActivityItem` through `toActivitySummary`, an allowlist that discards any detail
   field an injected payload could carry.
3. `GET /api/v1/activities/{id}` is requested only when a detail view opens; the details keep their
   own keys, caches and public/administrative boundaries.
4. Cards and summaries never fabricate a zero for a missing aggregate: the attendee total shows
   «No disponible» while the list contract does not publish it, and `ActivityCard` links to the
   administrative detail route where the counters and equipment are available.

## Consequences

### Positive

- **POS-001**: Loading the composite catalog issues only program listing and activity listing pages;
  the request budget is independent of the detail fields.
- **POS-002**: The summary type makes it impossible for a card or metric to depend on a field the
  list contract does not provide.
- **POS-003**: Detail traffic happens only when a person opens an activity, which matches the
  readership and keeps filters, pagination and the working-context selection free of detail loads.
- **POS-004**: Public and administrative detail boundaries remain separate and were already covered
  by their own hooks and tests.

### Negative

- **NEG-001**: Aggregate metrics such as "personas registradas" cannot be computed from the catalog
  anymore; the UI shows «No disponible» until the backend publishes an aggregate or includes the
  counters in a list operation.
- **NEG-002**: A dashboard that needs real enrollment totals will have to request details per
  visible activity or wait for a backend aggregate.
- **NEG-003**: The composite catalog still issues one listing request per event program; reducing
  that fan-out needs a global administrative listing the contract does not publish yet.

## Alternatives Considered

### Keep the fan-out until the list gains the detail fields

- **ALT-001**: **Description**: Preserve ADR-0005 and continue resolving `GET /api/v1/activities/{id}`
  for every listed activity.
- **ALT-002**: **Rejection Reason**: The cost grows linearly with the catalog and 5.9 explicitly
  requires a catalog load without a per-activity request; the details are already reachable on
  demand.

### Relax `Activity` instead of splitting the type

- **ALT-003**: **Description**: Make the four detail fields optional in `Activity`.
- **ALT-004**: **Rejection Reason**: Weakens the domain type, pushes null handling into every
  consumer and hides the contract boundary the summary type makes explicit.

### Change the backend first

- **ALT-005**: **Description**: Extend `EventProgramActivityItem` with `enrolledCount`,
  `checkedInCount` and `equipment` before removing the fan-out.
- **ALT-006**: **Rejection Reason**: Out of scope for the frontend repository; recorded as the
  trigger to revisit this decision if the aggregates become contract-backed.

## Implementation Notes

- **IMP-001**: `toActivitySummary` is the single projection; both the API and mock adapters use it so
  tests and Storybook read the same shape.
- **IMP-002**: `readCatalogActivitiesPage` reuses `mapActivitiesListPage` for validation and adds the
  flat `classroomId` and `eventProgramId` references the selectors resolve.
- **IMP-003**: Success criteria: catalog, filters, pagination and working-context selection produce
  zero detail requests; opening a detail produces exactly one, covered by
  `ActivityCatalogLoading.integration.test.tsx` and the adapter suite.

## References

- **REF-001**: `docs/adr/adr-0005-fanout-catalogo-actividades.md` (superseded by this record)
- **REF-002**: `src/features/activity-catalog/adapters/apiActivityCatalogAdapter.ts`
- **REF-003**: `src/features/activity-catalog/model/activitySummary.ts`
- **REF-004**: `src/features/activity-catalog/ui/ActivityCatalogLoading.integration.test.tsx`
- **REF-005**: `src/types/domain.ts` (`ActivitySummary`, `ActivityCatalog`)
