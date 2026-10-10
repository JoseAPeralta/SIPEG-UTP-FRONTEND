# Activities - Features

## Problem

Visitors need a trustworthy catalog, while authorized organizers need to schedule and maintain
activities without exposing drafts, bypassing classroom constraints, or assuming retention rules.

## Users

- Anonymous visitors and participants discovering activities.
- Administrators and collaborators maintaining activities.

## Desired Outcome

Public discovery and private administration share domain meaning but keep authorization, payloads,
and caches separate throughout the activity lifecycle.

## In Scope

- `ACT-001` public catalog of upcoming, available, and past activities.
- `ACT-002` search and combined filters by organizational unit, unit type, event program, and activity
  type, with selected-unit priority.
- `ACT-003` public detail for a publishable activity.
- `ACT-004` administrative activity data including name, type, description, speakers, classroom,
  date, time, capacity, required equipment, and banner when contract-supported.
- `ACT-005` compatible classroom selection.
- `ACT-006` publishing, unpublishing, and cancellation.
- `ACT-007` server-verified deletion of drafts under the published retention rule (`activity:delete`
  or ADMIN).
- `ACT-008` activity working-context selection.

## Out Of Scope

- Showing attendee-notification controls before their contracts exist.
- Defining activity payloads, lifecycle values, public visibility rules, or retention behavior.
- Managing collaborator grants or sending notifications directly.

## Domain Rules

- Every activity belongs to exactly one event program.
- Public requests do not send credentials; private administration is identity-scoped.
- Public and administrative activity data never share a cache entry.
- The backend is authoritative for publishability, scheduling, capacity, classroom conflicts, and
  whether an activity may be deleted: the frontend never certifies the absence of attendance or
  alert history from its own counters or inbox.

## User Stories

### Discover Activities (`ACT-001`, `ACT-002`, `ACT-003`)

As a visitor, I want to find and inspect relevant activities so that I can decide what to attend.

Acceptance criteria:

- Search and supported filters combine predictably and reset pagination when changed.
- The selected organizational unit is prioritized without hiding other matching activities.
- Past and currently available groupings are understandable, and non-public records are not exposed.
- Public detail shows only contract-confirmed publishable data.

### Maintain An Activity (`ACT-004`, `ACT-005`, `ACT-006`, `ACT-007`)

As an authorized organizer, I want to schedule and manage an activity safely.

Acceptance criteria:

- Forms submit only contract-confirmed fields and preserve input after recoverable conflicts.
- Classroom choices account for supported schedule, capacity, type, and amenity criteria.
- Only contract-permitted lifecycle actions are shown.
- Deletion is offered only for a `DRAFT` activity of an `ACTIVE` program to a user with effective
  `activity:delete` (or ADMIN); the server verifies attendance and alert retention.

### Select Activity Context (`ACT-008`)

As an operator, I want one activity as my working context so that downstream operations use the
correct scope.

Acceptance criteria:

- The selected activity is visibly identified and available to attendance, certificates, and reports.
- Reload, logout, or loss of access clears the selection.

## Quality Requirements

- Catalog and forms reflow on mobile and support keyboard and assistive technology.
- Public persistence contains only successful public catalog data.
- Catalog loading never requests a detail per list item: cards and summaries read the listing
  projection and the detail is fetched only when an activity is opened.
- Public/private boundaries, filters, forms, conflicts, and lifecycle actions have automated tests.

## Dependencies

- Event programs, organizational-unit and classroom catalogs, speakers, and collaboration.
- File upload contract for banners.
- Notification contract for attendee-notification decisions.

## Open Questions

- What banner upload and classroom-availability operations are available?

## Contract Notes (2026-10-09)

- 5.11 verified the publication and privacy matrix against the live contract: the anonymous listing
  never returns `DRAFT` or `CANCELLED` and only ADMIN can filter a non-public status; the public
  detail resolves a `CANCELLED` activity of an `ACTIVE` program through its direct link with the
  recorded reason, while a `DRAFT` direct link resolves to the empty state; `GET /users/me/scopes`
  requires a Bearer token and a `USER` only receives direct collaborations, so inherited reading is
  resolved through the program scope and an exact activity scope covers direct collaborators.
- The administrative detail view does not render any cached detail data (name, description,
  equipment, speakers, counters or the program link) until `activity:read` is confirmed. Pending
  discovery shows «Verificando acceso», a discovery failure shows a retryable
  «No se pudo verificar el acceso» instead of a false denial, and a confirmed revocation blocks the
  same cached detail again.
- Expiring permission windows retire capabilities without another network response: the view
  re-evaluates at the permission boundary through the shared collaboration authorization clock.
- Defect found by the gate and fixed in this phase: both catalog filter hooks wrapped the controlled
  search input state in `startTransition`, so under load the input commit lagged and keystrokes were
  lost (`ciberseguridad` collapsed to `cd`). Filter state now updates urgently; the catalog is small
  enough that the filtering commit stays synchronous.
- Harness correction: the visual runner now requires `storyFinished` with `status: "success"`
  before comparing or registering a screenshot. Previously a failed play could be captured and even
  frozen as a baseline; the corrupted `filtering-activities` baseline was deleted and regenerated
  with the real filtered state (two results).
- 5.10 verified the reconciliation matrix against the live contract: every successful activity write
  revalidates the owning program's pages, the composite administrative catalog (both modes, hence
  the dashboard and the working-context options), the public agenda and the affected public detail,
  the available-classroom query and the discovered scopes. The private detail is overwritten with
  the authoritative response instead of being refetched.
- The independent event-program listing is not revalidated: `EventProgramDetail` carries no
  activity-derived fields, and the `activityCount` shown per program is composed from the
  administrative catalog that is already revalidated.
- Deleting a draft does not revalidate classroom availability: only `DRAFT` activities can be
  deleted and a draft never reserves a room (`SCHEDULED` and `ONGOING` do).
- A late detail read never overwrites the mutation response, because the pending read is cancelled
  before writing, and a response from a previous session generation never writes private data.

## Contract Notes (2026-10-08)

- Lifecycle operations are `PATCH /api/v1/activities/{id}` for publishing (`DRAFT` -> `SCHEDULED`)
  and unpublishing (`SCHEDULED` -> `DRAFT`), and `POST /api/v1/activities/{id}/cancel` for
  cancellation. Both return the resulting `ActivityDetail`, whose effective `status` is
  authoritative.
- Publishing and unpublishing require `activity:update` (or the ADMIN role); cancellation requires
  the separate `activity:cancel` permission (or ADMIN). The two permissions are independent: neither
  grants the other, and an `ONGOING` activity can be cancelled but not edited or unpublished.
- The `PATCH` request body only accepts `status` values `DRAFT` and `SCHEDULED`; `ONGOING`,
  `COMPLETED` and `CANCELLED` are rejected with `409`, and the owning event program stays immutable.
  Publishing may revalidate classroom capacity, schedule window and overlaps.
- Cancellation accepts `DRAFT`, `SCHEDULED` and `ONGOING`. A `COMPLETED` activity or an activity of
  a non-`ACTIVE` program responds `409`. Cancelling an already cancelled activity is idempotent: it
  responds `200` without overwriting the originally recorded reason.
- The cancellation reason is optional, is trimmed, and accepts at most 500 characters; the body is
  `{}` or `{ "reason": "…" }`, with `additionalProperties: false`.
- `DELETE /api/v1/activities/{id}` physically deletes a draft and responds `204` without a body; the
  request sends no body and requires a Bearer token. It needs the effective `activity:delete`
  permission or the ADMIN role; `activity:delete` is only an `ORGANIZER` role default, so the UI
  checks the effective grant instead of the role. Only a `DRAFT` activity inside an `ACTIVE` event
  program can be deleted, and deleting removes equipment, speaker links and local collaborations
  while the speaker catalog entry is kept.
- Retention: an activity with attendance records or alert records cannot be deleted; the endpoint
  responds `409`. Archived event programs are frozen and their activities also respond `409`. The
  frontend cannot prove that history from its own counters or from the personal alert inbox, so the
  UI only checks the effective permission, the activity status and the program status; the server
  verifies the complete eligibility.
- The anonymous listing (`GET /api/v1/activities`) never returns `DRAFT` or `CANCELLED` activities,
  while the public detail (`GET /api/v1/activities/{id}`) can still resolve a `CANCELLED` activity
  of an `ACTIVE` program through its direct link, showing the recorded `cancelReason`.
- The 5.8 notification block was verified on 2026-10-08 against the four activity write operations
  (`POST /api/v1/activities`, `PATCH /api/v1/activities/{id}`, `POST /api/v1/activities/{id}/cancel`
  and `DELETE /api/v1/activities/{id}`): none publishes a notification input or result. Request
  allowlists discard `notifyAttendees`, including `false`, and success announcements confirm only the
  completed activity operation; the free-text envelope `message` is not evidence of delivery.
  `NTF-002` and `NTF-004` remain pending contract.
- 5.9 verified the request budget against the live contract: `ActivityListItem` and
  `EventProgramActivityItem` never carry `equipment`, `enrolledCount`, `checkedInCount` or
  `cancelReason`, so the composite catalog projects each row to `ActivitySummary` and requests the
  detail only when a view opens the activity (ADR-0016). Cards show «No disponible» for the attendee
  total until the backend publishes an aggregate; the administrative detail keeps its counters and
  equipment.

## Contract Notes (2026-10-07)

- Administration lives per program: `GET /api/v1/event-programs/{id}/activities` pages and filters
  server-side, while `GET /api/v1/activities/{id}` resolves the full detail with `equipment`,
  `enrolledCount` and `checkedInCount` that the listing omits.
- `POST /api/v1/activities` creates a `DRAFT` inside an `ACTIVE` program; `PATCH` accepts a partial
  body, keeps the event program immutable and rejects `ONGOING`, `COMPLETED` and `CANCELLED` with
  `409`. Capacity is written as `maxCapacity` and read as `capacity`.
- Speakers travel inline; the detail never returns their email or organization, so an edit of any
  other field must omit `speakers` to preserve the stored data.
- Classroom validation (existence, active state, capacity, weekly window and overlaps) applies when
  the resulting activity requests or reserves a classroom. The availability operation cannot
  exclude the edited activity's own reservation, so the UI keeps the assigned classroom labelled
  "validated on save" instead of claiming a conflict.

## Contract Notes (2026-10-06)

- Public list statuses are `SCHEDULED`, `ONGOING` and `COMPLETED`; `DRAFT` and `CANCELLED` stay
  administrative, and the anonymous listing never returns them.
- "Available" means published activities that have not finished; the listing exposes `capacity` but
  neither enrollments nor remaining seats, so availability never promises free seats.
- `GET /api/v1/activities` supports `when=upcoming|past|all`, program, unit, unit type, activity
  type, classroom and inclusive date-range filters; only an ADMIN can filter non-public statuses.
- `GET /api/v1/activities/{id}` is public: anonymous callers see non-DRAFT activities of ACTIVE
  programs, while a direct link may still resolve a cancelled activity with its `cancelReason`.
- The public detail exposes `enrolledCount`, `checkedInCount` and `equipment`, and never exposes
  check-in codes. Enrollments, certificates and notifications remain out of scope until their
  contracts exist.
