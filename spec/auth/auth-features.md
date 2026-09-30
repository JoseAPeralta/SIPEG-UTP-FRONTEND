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
- Change the current session's password through `POST /api/v1/auth/change-password`, keeping the
  session identified by the sent refresh token.
- View and update the own profile through `GET /api/v1/users/me` and `PATCH /api/v1/users/me`,
  sending only the editable attributes and replacing the stored profile with the response.
- Clear session data, working context, unit preference, query cache, and persisted public cache on
  logout or failed restoration.
- Attach the access token as a Bearer credential only to requests explicitly declared
  authenticated while a session exists.
- Restrict administrative routes to authenticated users with the `ADMIN` global role.
- Remove legacy sessions persisted by previous versions.

## Out Of Scope

- Password recovery and email verification.
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
- A profile update replaces only the stored profile, preserving rotated tokens, and is discarded when
  the response belongs to a different identity.
- Visible errors never expose backend messages, tokens, or request paths.

## User Stories

### Log In

As an administrator, I want to authenticate with my institutional credentials so that I can reach
the panel with a session the backend recognizes.

Acceptance criteria:

- The login form collects email and password and submits them to the authentication adapter.
- A successful login stores the profile and token pair and navigates to the panel.
- Standard users land on their personal area instead of the administrative panel.
- Invalid credentials show a localized, non-revealing error message.
- A rejected login is answered identically for a wrong password, an inactive account and an
  unverified email, because the contract cannot tell them apart.
- The login form offers static guidance to check the verification email, without asserting that any
  particular account is unverified.
- Too many attempts are reported as a temporary limit, without a countdown, because the contract
  documents no wait time.
- The submit control reports progress and prevents duplicate submissions.

### Keep The Session

As a signed-in user, I want to reload the application without re-authenticating so that I can keep
working.

Acceptance criteria:

- On startup, a stored refresh token is rotated and the profile is loaded before protected routes
  render.
- Without a stored refresh token, the application finishes startup as anonymous and raises no notice.
- A refresh credential that is absent or malformed finishes startup as anonymous and raises no
  notice, because nothing was signed in to begin with.
- An expired or rejected refresh token clears all local session state and records an in-memory reason
  so the login page can explain the interruption.
- A failed restoration that arrives after a successful sign-in is discarded, so it never tears down
  the newer identity.
- A connectivity or server failure during restoration is reported as a service problem, never as an
  expired session.
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

As a signed-in user, I want to correct my own name, unit and career so that my institutional data
stays accurate without asking an administrator.

Acceptance criteria:

- The form prefills from the profile already validated in the session store, without a second private
  request and without persisting the profile.
- Only `firstName`, `lastName`, `unitId` and `careerId` can be submitted, and only when they change.
- Email, identification number and global role are read-only text.
- Selecting the "Otro" unit sends a null unit, omits the career, and locks the career to "Otros".
- A successful update replaces the stored profile with the backend response and keeps the session.

### Authorize Routes

As the platform, I want route guards to reflect the authenticated role so that standard users do
not open administrative screens.

Acceptance criteria:

- Routes without a session redirect to `/login`.
- Authenticated standard users who open an administrative route are redirected to `/perfil`.
- The navigation menu only exposes the administrative panel to `ADMIN` users.
- `/cambiar-contrasena` and `/perfil` are available to every authenticated role and never to
  anonymous visitors. `/cambiar-contrasena` is reachable from the security section of `/perfil` and
  by direct link, but it is not a separate entry in the main menu.
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
