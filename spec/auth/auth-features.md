# Authentication And Session - Features

> Ownership note: this supporting spec records the implemented authentication and session design.
> The primary capability owner for `ACC-001` through `ACC-008` is
> `spec/accounts/accounts-features.md`.

## Problem

The administrative panel must only be reachable by users the backend can identify and authorize.
The previous frontend kept a demonstration user in `localStorage`, so anyone could fabricate a
session and the application never contacted the authentication API. Without a real session, every
administrative module, permission decision, and audit trail lacks a trustworthy identity.

## Users

- Administrators and standard users with an account in the backend.
- Event organizers whose permissions are evaluated by the backend.

## Desired Outcome

A user can authenticate with institutional credentials, keep working across page reloads without
re-entering the password, close the session explicitly, and only see administrative routes when
the authenticated profile allows it.

## In Scope

- Log in with email and password through `POST /api/v1/auth/login`.
- Store the authenticated profile and access token in memory only.
- Store the refresh token and its expiration in `sessionStorage`.
- Restore the session on reload by rotating the refresh token and loading `GET /api/v1/users/me`.
- Rotate the token pair before the access token expires.
- Revoke the refresh token on logout through `POST /api/v1/auth/logout`.
- Clear session data, working context, unit preference, query cache, and persisted public cache on
  logout or failed restoration.
- Attach the access token as a Bearer credential only to requests explicitly declared
  authenticated while a session exists.
- Restrict administrative routes to authenticated users with the `ADMIN` global role.
- Remove legacy sessions persisted by previous versions.

## Out Of Scope

- Password recovery, password change, and email verification.
- Creating or editing users.
- Assigning program or activity permissions and collaborators.
- Cross-tab session synchronization.
- Storing tokens in cookies, which requires a backend contract change.

## Domain Rules

- The backend profile and authorization responses are authoritative; route guards only improve the
  experience.
- Global roles follow the backend contract: `ADMIN` and `USER`.
- The access token is never persisted; the refresh token never leaves the tab session storage.
- Editing any persisted value must not create an authenticated session.
- A failed refresh or profile load invalidates the local session before protected routes render.
- Visible errors never expose backend messages, tokens, or request paths.

## User Stories

### Log In

As an administrator, I want to authenticate with my institutional credentials so that I can reach
the panel with a session the backend recognizes.

Acceptance criteria:

- The login form collects email and password and submits them to the authentication adapter.
- A successful login stores the profile and token pair and navigates to the panel.
- Standard users land on the public catalog instead of the administrative panel.
- Invalid credentials show a localized, non-revealing error message.
- The submit control reports progress and prevents duplicate submissions.

### Keep The Session

As a signed-in user, I want to reload the application without re-authenticating so that I can keep
working.

Acceptance criteria:

- On startup, a stored refresh token is rotated and the profile is loaded before protected routes
  render.
- Without a stored refresh token, the application finishes startup as anonymous.
- An expired or rejected refresh token clears all local session state.
- The token pair is rotated before the access token expires.

### Close The Session

As a signed-in user, I want to close the session so that no credential remains available on the
device.

Acceptance criteria:

- Logout asks the backend to revoke the refresh token, tolerating network failures.
- Logout clears the in-memory session, the stored refresh token, the working context, the unit
  preference, the query cache, and the persisted public cache.
- Legacy `sipeg-session` data from previous versions is removed.
- After logout, protected routes redirect to the login page.

### Authorize Routes

As the platform, I want route guards to reflect the authenticated role so that standard users do
not open administrative screens.

Acceptance criteria:

- Routes without a session redirect to `/login`.
- Authenticated standard users are redirected to the public landing page.
- The navigation menu only exposes the administrative panel to `ADMIN` users.
- Backend authorization remains the final authority for every request.

## Quality Requirements

- Credentials, tokens, and profile data are never written to logs or persisted query caches.
- All authentication controls are keyboard accessible and programmatically labeled.
- Loading, error, and retry states are handled through the adapter seam.
- Meaningful behavior is covered with Vitest and Testing Library, with tests colocated next to the
  file under test.
- `pnpm run check` passes before the feature is considered implemented.

## Dependencies

- `POST /api/v1/auth/login`, `POST /api/v1/auth/refresh`, `POST /api/v1/auth/logout`, and
  `GET /api/v1/users/me`.
- Organizational unit and career references returned by the authenticated profile.
- Shared frontend state for session, unit preference, and working context.

## Open Questions

- A refresh cookie requires a backend contract change; until then the refresh token lives in
  `sessionStorage` (ADR-0009).
- Cross-tab logout and token refresh coordination are not covered by this increment.
- Program and activity permissions will extend the authorization model beyond the global role.
