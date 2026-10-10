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

## Implementation Status — Phase 4.1 (2026-10-06)

- `features/event-programs` owns program mapping, API/mock reading, Spanish status labels and the
  independent administrative `useEventPrograms` query. Program reads do not load activities,
  classrooms or organizational-unit catalogs.
- `EventProgramsAdapter` is injected into the composed activity catalog by both composition roots;
  its browser implementation remains deferred. Program administration does not import the catalog
  (architecture rule R12); R8 reserves the exact program listing endpoint to its owning adapter.
- Administrative query keys include user identity and exclude credentials and offline persistence.
- Confirmed live `GET /api/v1/event-programs`: optional Bearer, ACTIVE by default, pages of at most
  50, contractual name/label search and unit/type/status filters. Only ADMIN may use non-ACTIVE
  status filters; collaborator discovery remains the separate scopes operation from phase 3.
- This phase establishes the module boundary. Writes and lifecycle (4.3–4.6), collaboration/context
  integration (4.7–4.8) and form coverage (4.9) remain scheduled.

Evidence: `docs/superpowers/plans/2026-10-06-fase-4.1-modulo-programas.md`.

## Implementation Status — Phase 4.2 (2026-10-06)

- `EventProgramsAdapter.loadEventProgramsPage` requests one filtered page at a time and
  `useEventProgramsPage` keys results by identity, filters and page; administrative pages are never
  persisted offline.
- `/admin/programas` composes search, organizational-unit, status and server pagination. The listing
  starts on "Todos" (`status=ALL`) because omitting the parameter returns only ACTIVE programs.
- The screen is ADMIN-only: the live contract honors non-ACTIVE statuses only for that role, so
  collaborators keep discovering work through `/operaciones`; the roadmap records the boundary.
- Results embed `organizationalUnit`, so rows are labeled without a second catalog request. The unit
  query only fills the filter, and its failure leaves the list visible with its own retry.
- Date filters do not exist in OpenAPI: dates are displayed per result and the missing filter stays
  documented as a contractual gap.

Evidence: `docs/superpowers/plans/2026-10-06-fase-4.2-listado-programas.md`.

## Implementation Status — Phases 4.4–4.6 (2026-10-06)

- Editing and lifecycle live in a panel of `/admin/programas`: the contractual detail endpoint only
  returns ACTIVE programs, so drafts and archived records are managed from the validated list row.
- `PATCH /api/v1/event-programs/{id}` sends an allowlisted body; publishing is the only accepted
  status transition (`DRAFT -> ACTIVE`) and is presented as its own confirmation. Archived programs
  expose no edit control.
- `POST .../archive` and `POST .../reactivate` are explicit confirmed actions; physical deletion is
  never offered. A `409` explains the applicable restriction (running activities, permanent agenda,
  non-archived program) without claiming a cause the contract does not separate.
- The permanent agenda is presented without dates, without archive or direct reactivation, and links
  to its owning unit, which owns its lifecycle. Editing it omits the date fields entirely.
- `GET /api/v1/event-programs/{id}` remains unused by administration; a change to the permanent
  agenda refreshes its unit detail in both administrative and public cache boundaries.
- The mock reproduces archive conflicts through a deterministic seed and validates that new dates do
  not leave existing activities outside the range.

Evidence: `docs/superpowers/plans/2026-10-06-fase-4.4-4.6-ciclo-vida-programas.md`.

## Implementation Status — Phase 4.3 (2026-10-06)

- `POST /api/v1/event-programs` was reconfirmed against the live contract: `bearerAuth`, `program:create`
  permission (only ADMIN without a collaboration scope for that permission), and a non-default `DRAFT`
  program for an active organizational unit. `bannerUrl` stays out of scope until phase 6.
- `CreateEventProgramForm` and `useCreateEventProgram` add the creation flow inside `/admin/programas`.
  Local validation covers name and text limits, real dates and range order, and a unit that is no longer
  active; the contract shares one `400` for an invalid range and an inactive unit, so the form explains
  both together without exposing backend messages.
- The HTTP adapter rebuilds the body with an allowlist, reads the token at operation time and validates
  the creation envelope; success invalidates every administrative page by identity-scoped prefix, and
  the confirmation warns that the new draft may fall outside the active filters.
- The mock keeps one program collection per instance and reads the units of its own composition at
  creation time, so a unit deactivated in the same composition is rejected like the backend would.
- Accessibility finding fixed during the phase: a Chakra `Button` with `loading` hides its children and
  axe reported a missing accessible name; `loadingText` keeps the submit button announced while saving.

Evidence: `docs/superpowers/plans/2026-10-06-fase-4.3-creacion-programas.md`.

## Implementation Status — Phases 4.7–4.8 (2026-10-06)

- Program detail exposes collaboration inside the `/admin/programas` panel, not on a route: every
  card opens `CollaboratorsView` scoped to that program and composes it over the validated list row,
  because the contractual detail only returns ACTIVE programs.
- Archived programs stay consultable in read-only mode: the collaborator list and effective
  permissions remain visible, modification commands disappear and a conflict recovery refreshes both
  the collaborators and the program list, preserving what the user typed.
- Working context accepts every readable program: the administrative catalog reads programs and
  activities with `status=ALL` and units/classrooms including inactive ones under identity-scoped
  keys that are never persisted. Selecting an archived program keeps its selection.
- A complete, finished and error-free read reconciles the selection: a context confirmed as absent is
  retired with a localized announcement, while loading, refetching or failing keeps it without
  presenting it as current. Selection from the card writes only `{ kind, id }`.
- Operational access loss recovers navigation: a previously authorized scope that disappears from
  discovery navigates back to `/operaciones` with an announcement; a network error is never reported
  as confirmed loss.
- Mocks share program state per composition, so creating, archiving and reactivating a program is
  reflected by collaboration and by scope discovery in the same instance.

Evidence: `docs/superpowers/plans/2026-10-06-fase-4.7-colaboradores-programas.md` and
`docs/superpowers/plans/2026-10-06-fase-4.8-contexto-programas.md`.

## Implementation Status — Phase 4.9 (2026-10-06)

- Form coverage closes the module: `CreateEventProgramForm` focuses the name on mount, `Tab` reaches
  every control, `Enter` submits and each invalid field exposes `aria-invalid` plus its accessible
  error message. `EditEventProgramForm` starts on the name and keeps the same association.
- `EventProgramsView` opens a single panel at a time, disables the controls that would replace it
  while a creation or lifecycle mutation is pending, and sends one request per action. A concurrent
  resolution can no longer close a panel opened after it.
- A `409` on editing now names both possibilities the contract does not separate: a concurrent
  archive and dates that leave activities outside the range. After a `conflict` or `notFound`, the
  form and the lifecycle confirmation offer «Actualizar listado», an explicit re-read that preserves
  what was typed and never repeats the mutation; refreshed rows adjust their available actions.
- The complete cycle (create draft → edit → publish → archive → reactivate) runs against the mock
  with shared state, observing badges, actions, announcements and focus after each step. Program
  stories get their own mock composition and Query client per story.
- A browser check inside the Storybook gate covers real keyboard activation, 320 px reflow without
  horizontal overflow, 24 x 24 px minimum target sizes and axe over the mobile confirmation,
  including its hover state.
- Accessibility finding: Chakra's `solid/90` hover lowered the white-text contrast of solid buttons
  below AA on light surfaces. The theme now uses the opaque 600 scale, matching the hover documented
  in `DESIGN.md`; the reactivation confirmation uses the custom `success` palette.

Evidence: `docs/superpowers/plans/2026-10-06-fase-4.9-pruebas-programas.md`.
