# User Administration - Features

## Problem

Administrators need to maintain platform users without coupling the workflow to unrelated operations
data or allowing dangerous changes to critical accounts.

## Users

- Administrators responsible for user records.
- Support staff with contract-confirmed access, if such access exists.

## Desired Outcome

Authorized administrators can find, create, inspect, and modify users with actionable conflict
feedback and clear institutional relationships.

## In Scope

- `USR-001` user listing, search, filters, and pagination.
- `USR-002` user creation, detail, and modification.
- `USR-003` organizational-unit and career assignment.
- `USR-004` safeguards for conflicts and critical administrative changes.

## Out Of Scope

- Self-service profile editing.
- Program and activity collaboration grants.
- Assuming user fields, states, filters, or conflict responses before contract confirmation.

## Domain Rules

- Only authorized administrators can access user administration; backend authorization is final.
- Server-controlled identifiers and audit data are never editable through generic form binding.
- Critical changes require explicit confirmation and preserve the current record after a conflict.

## User Stories

### Find A User (`USR-001`)

As an administrator, I want a searchable and paginated user list so that I can locate a record.

Acceptance criteria:

- Search, filters, and pagination match only contract-supported parameters.
- Loading, empty, unavailable, and error states are distinct.

### Create Or Edit A User (`USR-002`, `USR-003`)

As an administrator, I want to maintain user details and institutional relationships so that records
remain accurate.

Acceptance criteria:

- Forms submit only contract-confirmed editable fields.
- Unit and career choices use current catalog references.
- Duplicate or invalid relationships show localized feedback and retain safe form input.

### Protect Critical Accounts (`USR-004`)

As the platform, I want risky administrative changes guarded so that access is not accidentally lost.

Acceptance criteria:

- The UI does not claim a change succeeded until the backend confirms it.
- Contract-reported safeguards such as self-change or last-administrator conflicts are explained
  without exposing raw responses.

## Quality Requirements

- Private user data is never persisted offline or included in logs or URL parameters.
- Tables and forms support keyboard use, reflow, labels, and announced validation errors.
- Mappers, list behavior, forms, and conflict handling have colocated tests.

## Dependencies

- Administrative user API contract.
- Organizational-unit and career catalogs.
- Authentication, route guards, and private query-cache isolation.

## Open Questions

- Which list filters, editable fields, user states, and administrative operations are contractual?
  Resolved: the list filters by `globalRole`, `isActive`, `unitId`, `careerId` and `q`; the detail and
  `PATCH` edit only `globalRole`, `isActive`, `unitId` and `careerId`; there is no `DELETE`, so the
  lifecycle closes with `PATCH { isActive }`.
- Which critical-account safeguards are enforced and how are conflicts represented? Resolved: the
  backend rejects self-deactivation/demotion, demoting or deactivating the last active administrator
  and promoting an inactive account with a `409`, and combining promotion with deactivation. The UI
  explains these causes without exposing the raw response.
- Can any non-administrator role access user administration? Resolved: the endpoint requires
  `bearerAuth` and the `ADMIN` role; collaboration grants are a separate concern (Fase 3.6-3.8).
