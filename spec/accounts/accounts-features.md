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
- Inactive, unverified, expired, throttled, and unknown states are presented only when confirmed by
  the contract, without raw backend messages.

### Maintain My Profile (`ACC-006`, `ACC-007`)

As an authenticated user, I want a personal area where I can review and update allowed profile data.

Acceptance criteria:

- Only contract-editable profile attributes can be submitted.
- Server-controlled identity, role, state, and identifiers cannot be changed through the form.
- Standard users reach a useful personal destination rather than an administrative dead end.

## Quality Requirements

- Forms are keyboard accessible, labelled, and preserve safe input after recoverable errors.
- Sensitive data is excluded from logs, persistent storage, query keys, and public caches.
- Account behavior has colocated automated tests and localized loading, success, and error states.

## Dependencies

- The authentication and account API contracts.
- Institutional catalogs used by registration or profile data.
- Session state, private query-cache cleanup, and route guards.

## Open Questions

- Which operations and fields support password recovery, password change, and profile editing?
- Which account states and retry metadata are exposed by the contract?
- Does a password change revoke other sessions, and how is that result represented?
