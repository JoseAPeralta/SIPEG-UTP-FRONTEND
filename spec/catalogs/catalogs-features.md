# Institutional Catalogs - Features

## Problem

Users, programs, and activities depend on consistent organizational units, careers, and classrooms,
but read-only fragments do not support institutional maintenance or reliable room selection.

## Users

- Administrators maintaining institutional references.
- Visitors and account holders selecting public registration references.
- Organizers selecting units, careers, or classrooms in downstream workflows.

## Desired Outcome

Catalog data is reusable, current, and appropriately separated between public reference reads and
restricted administration.

## In Scope

- `CAT-001` organizational-unit administration.
- `CAT-002` institutional and global career administration.
- `CAT-003` classroom and laboratory inventory, including available days and hours, capacity, type,
  location, and amenities such as projectors, desks, tables, smart boards, and whiteboards.
- `CAT-004` classroom availability lookup for an activity's needs.
- `CAT-005` public reference access and restricted catalog administration.

## Out Of Scope

- Activity scheduling and conflict-resolution rules owned by activities.
- Inventing catalog states, conflict codes, fields, or mutation operations.
- Treating a client-side availability calculation as authoritative.

## Domain Rules

- Public reference data and administrative data use distinct authorization and cache boundaries.
- Classroom types and availability values are rendered from contract-confirmed values with localized
  labels.
- Backend validation remains authoritative for relationships, availability, and conflicts.

## User Stories

### Maintain Institutional References (`CAT-001`, `CAT-002`, `CAT-005`)

As an administrator, I want to find and maintain units and careers so that dependent forms use valid
institutional data.

Acceptance criteria:

- Lists support the contract-confirmed search, detail, and lifecycle operations.
- Mutations refresh public references and dependent private selectors without mixing their caches.
- Relationship or lifecycle conflicts preserve input and show localized guidance.

### Maintain Classroom Inventory (`CAT-003`)

As an administrator, I want classroom details and weekly availability recorded so that organizers
can choose suitable spaces.

Acceptance criteria:

- The UI represents contract-confirmed type, location, capacity, amenities, days, and time ranges.
- Adjacent and overlapping availability ranges are displayed without silently rewriting server data.
- Missing optional information is distinguished from an empty or zero value.

### Find A Suitable Classroom (`CAT-004`)

As an organizer, I want to narrow classrooms by activity needs so that unsuitable rooms are not
presented as selectable.

Acceptance criteria:

- Selection can consider date, time, capacity, type, and amenities when supported by the contract.
- The final availability decision is validated by the backend.

## Quality Requirements

- Dense catalog controls remain usable by keyboard and at mobile widths.
- Publicly persisted data excludes administrative or private fields.
- Mappers, availability presentation, hooks, and mutations have colocated tests.

## Dependencies

- Catalog API operations and authorization policy.
- Account, user, program, and activity forms consuming catalog references.

## Open Questions

- Which lifecycle and mutation operations are currently exposed for each catalog?
- What classroom types, amenity representation, day format, and availability rules are contractual?
- Does the backend provide an availability query or only data from which availability is displayed?
