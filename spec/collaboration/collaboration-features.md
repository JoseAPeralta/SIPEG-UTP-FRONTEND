# Collaboration And Authorization - Features

## Problem

Collaborators need scoped access to programs and activities, but inherited and direct permissions can
be misleading unless their origin, validity, and effective result are visible.

## Users

- Administrators delegating work.
- Program and activity organizers, editors, and viewers.

## Desired Outcome

Each user discovers and operates only within effective scopes, while grant managers understand where
access comes from and what can safely be changed.

## In Scope

- `COL-001` understandable collaboration roles and permissions.
- `COL-002` discovery of accessible programs and activities.
- `COL-003` adding, changing, listing, and removing collaborators.
- `COL-004` inherited, local, and combined permission provenance.
- `COL-005` direct permission overrides with validity periods.
- `COL-006` immediate refresh of authorized navigation and actions.

## Out Of Scope

- Defining permission codes, role values, grant payloads, or scope-discovery operations.
- Replacing backend authorization with hidden controls or route guards.
- User account administration.

## Domain Rules

- Every effective authorization decision comes from the backend.
- Program collaboration is inherited by its activities by default when the contract confirms it.
- A locally managed grant must not offer a misleading way to revoke inherited access.
- Raw permission codes are translated to user-facing labels.

## User Stories

### Discover My Scope (`COL-001`, `COL-002`)

As a collaborator, I want to discover accessible work without knowing resource IDs in advance.

Acceptance criteria:

- Scope discovery does not issue one authorization request per public catalog item.
- Navigation and direct URLs reflect effective access while still handling backend denial.

### Manage Collaborators (`COL-003`, `COL-004`)

As a grant manager, I want to manage collaborators and see inherited users so that I do not create
conflicting or redundant access.

Acceptance criteria:

- Program and activity details distinguish local, inherited, and combined access.
- Inherited collaborators are shown when local activity collaboration is edited.
- Only contract-permitted role changes and removals are offered.

### Manage Direct Permissions (`COL-005`, `COL-006`)

As a grant manager, I want time-bounded direct permissions to update the experience promptly.

Acceptance criteria:

- Validity and effective state are displayed when supplied by the backend.
- Successful changes refresh permissions, menus, details, and working context.
- A rejected or expired grant never remains as an enabled client-side action.

## Quality Requirements

- Authorization data is private, identity-scoped, and never persisted offline.
- Permission origin and unavailable actions are understandable without color alone.
- Horizontal access, direct URLs, invalidation, and conflict handling have automated tests.

## Dependencies

- User, event-program, and activity resources.
- Backend permission evaluation and scope discovery.
- Identity-scoped query keys and route navigation.

## Open Questions

- What operation returns all scopes accessible to the current user?
- Which roles, permission codes, provenance values, and validity fields are contractual?
- What safeguards prevent removal of the last user able to delegate access?
