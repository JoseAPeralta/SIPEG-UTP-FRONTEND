---
title: "ADR-0005: Activity Catalog Fan-Out for Detail Fields"
status: "Superseded"
date: "2026-09-25"
authors: "SIPEG-UTP Team"
tags: ["architecture", "decision", "activities", "openapi", "adapters"]
supersedes: ""
superseded_by: "ADR-0016"
---

# ADR-0005: Activity Catalog Fan-Out for Detail Fields

## Status

**Superseded by [ADR-0016](./adr-0016-resumenes-actividades-detalle-bajo-demanda.md)** — 2026-10-08.
The composite catalog now reads listing summaries and requests the detail only when an activity is
opened; aggregate metrics wait for a contracted aggregate.

## Context

The API activity catalog adapter (`features/activity-catalog/adapters/apiActivityCatalogAdapter.ts`)
builds the full `ActivityCatalog` consumed by the admin and public views. The live OpenAPI contract
(queried on 2026-09-25 against `http://localhost:3000/api/openapi.json`) shows that only the detail
operation exposes every field of the frontend `Activity` type:

- `GET /api/v1/activities` ("List upcoming activities") returns `ActivityListItem` items with `id`,
  `name`, `description`, `type`, `date`, `startTime`, `endTime`, `capacity`, `bannerUrl`,
  `speakers`, `classroom`, `eventProgram` and `organizationalUnit`. It does not expose `status`,
  `equipment`, `enrolledCount`, `checkedInCount` or `cancelReason`, and it only lists upcoming
  activities.
- `GET /api/v1/event-programs/{id}/activities` ("List activities of an event program") returns
  `EventProgramActivityItem` items, which add `status` but still omit `equipment`, `enrolledCount`,
  `checkedInCount` and `cancelReason`.
- `GET /api/v1/activities/{id}` ("Get an activity") returns `ActivityDetail`, which adds
  `cancelReason`, `equipment`, `enrolledCount` and `checkedInCount`.

The frontend catalog needs those four fields for summaries, enrollment metrics, equipment display
and cancellation reasons, so the adapter currently fans out: it loads organizational units, event
programs and classrooms, then the activity ids of every event program, and finally one detail
request per activity.

## Decision

Keep the fan-out in `loadCatalog`: resolve activity ids from
`GET /api/v1/event-programs/{id}/activities` (paginated with a limit of 50) and fetch
`GET /api/v1/activities/{id}` for each activity, validating every payload through
`activityCatalogMapper` plus `catalogIntegrity` before exposing the catalog.

Revisit this decision when `ActivityListItem` or `EventProgramActivityItem` gains
`enrolledCount`, `checkedInCount`, `equipment` or `cancelReason`; at that point the per-activity
detail call can be removed for the covered fields.

## Consequences

### Positive

- **POS-001**: The catalog carries the complete `Activity` contract, so views and metrics do not
  need secondary requests or partial types.
- **POS-002**: Every payload is validated against the contract before it reaches hooks and UI.
- **POS-003**: The fan-out stays isolated in the composition root layer; features consume a plain
  `ActivityCatalog`.

### Negative

- **NEG-001**: Catalog load cost grows with the number of activities (one detail request per
  activity, plus one paginated list request per event program).
- **NEG-002**: Load latency depends on the backend allowing detail reads for every listed
  activity.
- **NEG-003**: If the backend later serves the same fields from a list operation, the extra
  requests become redundant until this ADR is superseded.

## Alternatives Considered

### Build the catalog from list operations only

- **ALT-001**: **Description**: Use `GET /api/v1/activities` and
  `GET /api/v1/event-programs/{id}/activities` only.
- **ALT-002**: **Rejection Reason**: `ActivityListItem` lacks `equipment`, `enrolledCount`,
  `checkedInCount` and `cancelReason`, and the global list only returns upcoming activities.

### Make the missing fields optional in the frontend domain type

- **ALT-003**: **Description**: Relax `Activity` so the fan-out is unnecessary.
- **ALT-004**: **Rejection Reason**: Weakens the domain type, pushes null handling into UI and
  metrics, and diverges from the detail contract the backend already publishes.

### Change the backend contract first

- **ALT-005**: **Description**: Extend `ActivityListItem` with the four fields in the backend.
- **ALT-006**: **Rejection Reason**: Out of scope for the frontend repository and not required to
  ship the catalog; recorded here as the trigger for revisiting the decision.

## Implementation Notes

- **IMP-001**: Keep `PAGE_LIMIT` pagination for list operations and `Promise.all` for detail
  batches; do not add caches outside the adapter.
- **IMP-002**: `assertCatalogIntegrity` runs after mapping so dangling program, unit or classroom
  references fail fast.
- **IMP-003**: Success criterion: removing the fan-out must not change `ActivityCatalog` nor any
  consumer; the provider still loads the catalog once per session.

## References

- **REF-001**: `docs/adr/adr-0001-adapters-mock-api.md`
- **REF-002**: `src/features/activity-catalog/adapters/apiActivityCatalogAdapter.ts`
- **REF-003**: OpenAPI operations `GET /api/v1/activities`,
  `GET /api/v1/event-programs/{id}/activities`, `GET /api/v1/activities/{id}`
- **REF-004**: `CONTEXT.md` (Adapters and Decisiones De Trabajo)
