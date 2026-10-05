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
- `ACT-007` deletion only after a contractual retention rule exists.
- `ACT-008` activity working-context selection.

## Out Of Scope

- Showing deletion or attendee-notification controls before their contracts exist.
- Defining activity payloads, lifecycle values, public visibility rules, or retention behavior.
- Managing collaborator grants or sending notifications directly.

## Domain Rules

- Every activity belongs to exactly one event program.
- Public requests do not send credentials; private administration is identity-scoped.
- Public and administrative activity data never share a cache entry.
- The backend is authoritative for publishability, scheduling, capacity, and classroom conflicts.

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
- Deletion remains unavailable until retention behavior is explicitly contracted.

### Select Activity Context (`ACT-008`)

As an operator, I want one activity as my working context so that downstream operations use the
correct scope.

Acceptance criteria:

- The selected activity is visibly identified and available to attendance, certificates, and reports.
- Reload, logout, or loss of access clears the selection.

## Quality Requirements

- Catalog and forms reflow on mobile and support keyboard and assistive technology.
- Public persistence contains only successful public catalog data.
- Catalog loading avoids a detail request for every list item.
- Public/private boundaries, filters, forms, conflicts, and lifecycle actions have automated tests.

## Dependencies

- Event programs, organizational-unit and classroom catalogs, speakers, and collaboration.
- File upload contract for banners.
- Notification contract for attendee-notification decisions.

## Open Questions

- Which list/detail fields, filters, lifecycle values, and transitions are currently contractual?
- Which records are public, and how are upcoming, available, and past activities identified?
- What retention rule and operation govern deletion?
- What banner upload and classroom-availability operations are available?
