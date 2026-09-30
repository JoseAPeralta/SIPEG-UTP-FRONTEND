# Accounts - Features

## Problem

People need a safe account lifecycle beyond registration, while administrators need identity they
can trust without exposing credentials or account existence.

## Users

- Visitors creating or verifying an account.
- Authenticated participants, speakers, collaborators, and administrators.

## Desired Outcome

A person can create, verify, access, recover, secure, and maintain their own account through clear
flows that preserve privacy and defer authorization to the backend.

## In Scope

- `ACC-001` public registration.
- `ACC-002` email verification.
- `ACC-003` login, session restoration, and logout.
- `ACC-004` password recovery without account enumeration.
- `ACC-005` authenticated password change.
- `ACC-006` own-profile viewing and editing.
- `ACC-007` a useful My Account destination.
- `ACC-008` safe handling of account states and errors.
- `ACC-009` an independently addressable section for each part of the personal area.
- `ACC-010` a continuous account journey covered by frontend integration tests.

## Out Of Scope

- Administrative user management and collaboration grants.
- Defining authentication operations or fields not present in the API contract.
- Persisting access tokens or profiles for offline use.

## Domain Rules

- The backend is authoritative for identity, account state, and authorization.
- Credentials, tokens, verification material, and private profile data are never logged or placed in
  URLs, public caches, or persisted query data.
- Recovery responses must not disclose whether an account exists.

## User Stories

### Establish An Account (`ACC-001`, `ACC-002`, `ACC-003`)

As a visitor, I want to register, verify my email, and sign in so that I can use personal features.

Acceptance criteria:

- Registration and verification use only contract-confirmed inputs and operations.
- Session restoration finishes before protected content renders, and logout clears private state.
- Authentication errors use localized, non-revealing messages.

### Recover And Protect Access (`ACC-004`, `ACC-005`, `ACC-008`)

As an account holder, I want to recover or change my password without exposing my account.

Acceptance criteria:

- Recovery confirmation is indistinguishable for known and unknown addresses.
- Password change requires an authenticated session and contract-confirmed inputs.
- Password change keeps the current session and never renders session credentials in the DOM, the
  URL, query keys or persistent storage.
- Inactive, unverified, expired, throttled, and unknown states are presented only when confirmed by
  the contract, without raw backend messages.

### Maintain My Profile (`ACC-006`, `ACC-007`)

As an authenticated user, I want a personal area where I can review and update allowed profile data.

Acceptance criteria:

- Only contract-editable profile attributes can be submitted.
- Server-controlled identity, role, state, and identifiers cannot be changed through the form.
- Standard users reach a useful personal destination rather than an administrative dead end.
- After logging in, a standard user lands on `/perfil` and an administrator lands on `/admin`.
- A standard user who opens an administrative route by URL is redirected to `/perfil`, never to an
  administrative screen.
- Email, identification number and global role are visible as read-only text and never as inputs.
- Selecting the "Otro" unit sends an explicit null unit, omits the career, and shows the forced
  global career instead of offering an inconsistent choice.
- The security section and the personal services stay reachable even when the institutional catalog
  fails, so a catalog problem cannot lock the user out of their own account.

### Reach Every Personal Section (`ACC-009`)

As an authenticated user, I want to go directly to any part of my personal area so that I do not
have to scroll past unrelated content.

Acceptance criteria:

- Each section has its own route: `/perfil/datos`, `/perfil/seguridad`, `/perfil/actividades` and
  `/perfil/certificados`. Opening a route directly or reloading it shows only that section.
- `/perfil` opens the account data, and `/cambiar-contrasena` remains a working alias of
  `/perfil/seguridad` so previously shared links do not break.
- The submenu is a navigation between routes, not a set of tabs over one document: the browser back
  button returns to the previously visited section.
- Desktop shows the submenu as a persistent side navigation; mobile shows a local disclosure that
  keeps the current section name visible while collapsed.
- Choosing a section closes the mobile disclosure and moves focus to the destination heading, so a
  keyboard or screen reader user is not left inside a menu that closed underneath them.
- The current section is conveyed by `aria-current="page"` and not by color alone.
- The section stays reachable when a sibling section fails to load; one broken service never hides
  the others.
- Personal areas and certificates are announced as pending services rather than empty or broken
  screens, and no control is rendered that leads nowhere.
- Every interactive target is at least 44 by 44 pixels, the layout reflows at 320 pixels, and it
  remains usable at 200 percent zoom.

### Complete My Account Journey (`ACC-010`)

As an account holder, I want the whole account lifecycle to work in one continuous flow so that I am
not left with a screen that only works in isolation.

Acceptance criteria:

- Registration, email verification, login, account data, profile editing, account security, password
  change and logout run in sequence over the real router, forms, hooks and session store, with only
  the HTTP boundary controlled.
- The session is established by the product login, never by writing to the session store, so a broken
  login cannot be hidden by the test.
- The verification link is exercised as a separate page load, because the token is read from the
  address bar and not from the router.
- A password change keeps the current session and never renders the new password.
- Logout clears the identity, the stored refresh credential, the persisted public cache, the working
  context, the unit preference and the private query keys, and opening a personal route again is
  refused.
- Access tokens, the profile, credentials and the verification token never reach `localStorage`,
  `sessionStorage` or the DOM. The only stored value is the refresh credential and its expiration.
- Every personal section reaches every other one from the submenu, and the browser back and forward
  entries move between sections because the submenu navigates between routes.

## Quality Requirements

- Forms are keyboard accessible, labelled, and preserve safe input after recoverable errors.
- Sensitive data is excluded from logs, persistent storage, query keys, and public caches.
- Account behavior has colocated automated tests and localized loading, success, and error states.

## Dependencies

- The authentication and account API contracts.
- Institutional catalogs used by registration or profile data.
- Session state, private query-cache cleanup, and route guards.

## Open Questions

- None for `ACC-008`. The contract was verified live and exposes no account-state field, no dedicated
  error code and no retry metadata.

## Resolved Decisions

- `ACC-005` uses `POST /api/v1/auth/change-password`, which requires the bearer access token plus
  `currentPassword`, `newPassword` and the `refreshToken` that identifies the session to preserve.
  The backend revokes every other session as part of the same operation.
- Registration, recovery and password change share one password policy of 12 to 20 characters,
  matching the `minLength: 12` and `maxLength: 20` documented for the three operations. The earlier
  product decision to cap recovery at 20 while registration accepted 128 is closed.
- `ACC-006` uses `GET /api/v1/users/me` and `PATCH /api/v1/users/me`, both requiring the bearer access
  token. The patch accepts only `firstName`, `lastName` and `unitId`; it returns the whole updated
  profile, so the response replaces the stored profile and never merges partial data.
- Selecting the "Otro" unit sends `unitId: null` and omits the career, because the backend forces the
  global "Otros" career. The contract cannot clear a career while keeping the same unit, so the
  frontend does not offer that choice.
- The personal destination is `/perfil`, created with the editable profile in phase 1.6. Phase 1.7
  extends that same route with the security section and personal access instead of creating a second
  equivalent destination, so `/mi-cuenta` is not introduced.
- `ACC-007` composes `/perfil` as the only personal destination. The route groups the editable
  profile, a security section that links to the existing `/cambiar-contrasena` flow, and an
  informational section that announces `/mis-actividades` and `/mis-certificados` as pending services.
  The pending services are not links, buttons or disabled controls, because their routes do not exist
  yet and the wildcard route would silently redirect them to the public catalog.
- The post-login destination is decided in one place, `resolveAuthLandingPath`, and both `LoginPage`
  and the administrative guard consume it, so an administrator and a standard user cannot drift apart
  between a successful login and a rejected administrative route.
- `ACC-008` presents four account states without diagnosing any of them. An inactive account, an
  unverified email and a wrong password all answer with the same rejection message, because the
  contract documents no field, no error code and no `Retry-After` that could tell them apart. Login
  offers static guidance to check the verification email for everyone, which helps a person whose
  account is half activated without asserting what is wrong with anyone else's account.
- A `429` is always reported as a temporary attempt limit and never with a countdown, because the
  wait time is not part of the contract. The same text is reused across login, registration,
  verification, recovery and session restoration so the limit always reads the same.
- A session that the server stops accepting ends with an in-memory reason shown on the login screen.
  A rejected or expired credential reads as an expired session, a `429` as a temporary limit and a
  connectivity failure as a service problem, so a network outage is never reported as a lost
  account. The reason is not persisted and disappears after a successful login or a voluntary
  logout.
- A rejected session also closes from the profile update and the password change, so the user is not
  left on a screen whose every action keeps failing. The route guard then sends them to the login
  screen with the reason already in place.
- Registration answers a `400` and a `409` with the same message, because the `409` reports an
  attribute that already exists and naming it would confirm the existence of an account.
- The verification token is read once and removed from the address bar before the request is sent,
  so it never stays in the URL, in the browser history or in a shared link. It is kept in component
  memory only so a retry is possible without asking the user to reopen the email, and the success
  panel is rendered only after the request resolves.
- `ACC-009` turns the personal area into four routes under one common frame, not into four isolated
  pages. `PersonalAreaLayout` owns the single `h1` of the area and the submenu, and each section is
  mounted in the `Outlet` according to the URL, so opening a route directly or reloading it shows only
  that section and the browser history returns to the previous one.
- Submenu visibility is decided with `useMediaQuery` and not with a CSS media query. With CSS the
  expanded state would not be observable in tests, `Escape` would have no state to close, and jsdom
  does not evaluate media rules reliably, leaving the mobile branch uncovered. The query is the same
  `48em` as the `md` breakpoint of the layout, so the side column and the state branch agree exactly.
- The layout deliberately holds no React state. A section that is still loading suspends its render and
  React discards a pending state update of a suspended component, which closed the disclosure under a
  person who had just opened it. The focus intent therefore lives in a ref, which survives an
  interrupted render, and the disclosure state belongs to `PersonalAreaNavigation`, a sibling subtree
  of the `Outlet` that never suspends. A regression test in `App.test.tsx` navigates through all four
  sections on a mobile viewport while a lazy section is loading, and fails with the previous design.
- Choosing a section closes the disclosure and moves focus to the destination heading, and `Escape`
  returns focus to the button. Without that movement, a person navigating with keyboard or screen
  reader would be left focused inside a menu that closed underneath them.
- The active section is marked with `aria-current="page"` and with a difference of shape, filled
  versus outlined, so color is never the only signal. Every link and the disclosure button measure at
  least 44 by 44 pixels, and the four links stack vertically when the disclosure is open.
- The security section moved to its own route and therefore no longer shares a document with the
  profile: a failure of the institutional catalog can no longer hide the password change. The
  existing forms are reused without modification, and each keeps its own `h2`, so the hierarchy is
  the area `h1` followed by one `h2` per section.
- `/perfil` and `/cambiar-contrasena` are kept as entry points and redirect with `replace` to their
  canonical route. They are not removed, so previously shared links and bookmarks keep working.
- `ACC-010` is covered by frontend integration tests, not by end-to-end tests. The journey mounts
  `App` with real forms, routes, hooks and stores and controls only the two adapters involved, so a
  defect in the login, the profile update or the logout cannot be hidden behind a stub. Delivering the
  verification email and revoking other sessions require two real backend sessions and stay in phase 12.
- The verification link is represented as a second page load, because `VerifyEmailPage` reads the token
  from `window.location` and not from the router. The first mount is unmounted explicitly so only one
  tree is queried.
- The stored refresh credential is intentional: `sessionStorage` keeps the refresh token and its
  expiration, and nothing else. The journey asserts that the record holds exactly those two fields and
  that no access token, profile attribute, password or verification token reaches any storage area or
  the DOM.
- After logout the public catalog is requested again when the landing page renders, by design, so the
  cleanup assertions target the private query keys, the persisted cache and the session storage instead
  of demanding an empty cache.
- The history assertions observe the real router history through a probe that calls `navigate(-1)` and
  `navigate(1)`, instead of reimplementing their semantics. The probe lives only in the test file. The
  pre-existing test that followed submenu links and was named after the browser history was renamed,
  because it never inspected the history.
