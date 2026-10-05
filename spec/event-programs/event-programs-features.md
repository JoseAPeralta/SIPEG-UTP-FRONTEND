# Event Programs - Features

## Problem

Activities require a stable program and organizational owner, while organizers need a lifecycle that
preserves permanent agendas and historical records.

## Users

- Administrators.
- Collaborators with effective program permissions.

## Desired Outcome

Authorized users can find and maintain event programs, including each unit's permanent default
program, without deleting history or leaking administrative data into public caches.

## In Scope

- `EPG-001` one permanent default event program per organizational unit.
- `EPG-002` administrative listing with search and filters.
- `EPG-003` creation with name, description, dates, custom label, and banner when supported.
- `EPG-004` editing and publishing.
- `EPG-005` archiving and reactivation without physical deletion.
- `EPG-006` collaboration in program detail.
- `EPG-007` program working-context selection.

## Out Of Scope

- Activity administration.
- Upload implementation before a file contract exists.
- Inventing lifecycle values, transitions, immutable fields, or conflict responses.

## Domain Rules

- Every event program belongs to exactly one organizational unit.
- Each organizational unit has one permanent default program; it has no event date range.
- Programs are archived rather than physically deleted.
- Administrative and public program reads use separate authorization and cache identities.

## User Stories

### Find A Program (`EPG-002`)

As an authorized organizer, I want to search and filter programs so that I can open the intended
record, including non-public records I may access.

Acceptance criteria:

- Filters and pagination use only contract-supported parameters.
- Administrative results never hydrate the public catalog cache.

### Maintain A Program (`EPG-001`, `EPG-003`, `EPG-004`, `EPG-005`)

As an authorized organizer, I want to create and maintain programs without damaging historical data.

Acceptance criteria:

- Forms expose only contract-confirmed fields and transitions.
- The default program is presented as a permanent agenda without incompatible date or archive actions.
- Archive and reactivation are explicit; physical deletion is not offered.
- Concurrent or relationship conflicts preserve safe input and provide localized guidance.

### Coordinate Program Work (`EPG-006`, `EPG-007`)

As a collaborator, I want program access and working context together so that downstream modules use
the intended scope.

Acceptance criteria:

- Program detail exposes collaboration through the collaboration capability.
- Selecting a program scopes downstream work to its activities.
- A selection is cleared when it is no longer accessible or the session ends.

## Quality Requirements

- Program forms and lifecycle confirmations work by keyboard and at mobile widths.
- Private drafts, permissions, and administrative fields are not persisted publicly.
- Mappers, filters, forms, transitions, cache invalidation, and context behavior have tests.

## Dependencies

- Organizational-unit catalogs and collaboration authorization.
- File upload contract for banners.
- Activity, attendance, certificate, and report working contexts.

## Open Questions

- Which program fields, list filters, lifecycle values, and transitions are contractual?
- Which fields become immutable, and what prevents archiving or reactivating a program?
- What upload operation and file constraints apply to banners?
