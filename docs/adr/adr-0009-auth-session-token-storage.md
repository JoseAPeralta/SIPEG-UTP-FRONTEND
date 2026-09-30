---
title: "ADR-0009: Auth Session and Token Storage"
status: "Superseded"
date: "2026-09-26"
authors: "SIPEG-UTP Team"
tags: ["architecture", "decision", "authentication", "security", "session"]
supersedes: ""
superseded_by: "adr-0013-httponly-refresh-cookie-cross-tab"
---

# ADR-0009: Auth Session and Token Storage

## Status

**Superseded** by [ADR-0013](./adr-0013-httponly-refresh-cookie-cross-tab.md). The `sessionStorage`
compromise described here was conditional on the backend contract; that contract now ships the
`HttpOnly` cookie that this ADR identified as the preferred end state.

## Context

The API contract exposes login, refresh and logout operations that exchange an access/refresh token
pair in JSON. `GET /api/v1/users/me` requires the access token as a Bearer credential. The current
frontend does not consume those operations: it persists a complete mock `User` in `localStorage`
and considers any stored object an authenticated session. That object is forgeable, has no expiry
and cannot be revoked remotely.

The current backend does not expose the refresh token through an `HttpOnly` cookie, so the frontend
must temporarily retain a JavaScript-readable refresh token if a page reload is expected to restore
the session.

## Decision

- Introduce an `AuthAdapter` for login, refresh, logout and the authenticated profile.
- Keep the access token and authenticated profile only in Zustand memory.
- Store only the refresh token and its expiration in `sessionStorage`; never persist the access
  token or authenticated profile.
- Restore a session by rotating the refresh token and then loading `/api/v1/users/me`.
- Clear local session data, the Query client, persisted public cache, working context and unit
  preference whenever logout or refresh fails.
- Treat the backend profile and authorization responses as authoritative. Route guards improve the
  experience but never replace backend authorization.
- Prefer an `HttpOnly`, `Secure`, same-site refresh cookie when the backend contract supports it;
  that contract change will supersede the `sessionStorage` compromise.

## Consequences

### Positive

- **POS-001**: Editing a persisted user object no longer creates an authenticated session.
- **POS-002**: Access credentials are not retained across reloads and the refresh credential is
  scoped to the browser tab session.
- **POS-003**: Login, refresh and logout revoke or validate server-side sessions through the API.
- **POS-004**: The design has an explicit migration path to an `HttpOnly` refresh cookie.

### Negative

- **NEG-001**: `sessionStorage` is JavaScript-readable and remains exposed to successful XSS.
- **NEG-002**: Browser tabs have independent refresh-token state until cross-tab coordination is
  introduced.
- **NEG-003**: Session restoration requires two network operations: refresh and profile loading.

## Alternatives Considered

### Persist Both Tokens in localStorage

- **ALT-001**: **Description**: Keep the access and refresh tokens across browser restarts.
- **ALT-002**: **Rejection Reason**: It maximizes credential exposure to XSS and exceeds the
  requirement for a browser-session login.

### Keep Both Tokens Only in Memory

- **ALT-003**: **Description**: Never write credentials to Web Storage.
- **ALT-004**: **Rejection Reason**: Every reload would terminate the session because the current
  API cannot restore it through a cookie.

### HttpOnly Refresh Cookie

- **ALT-005**: **Description**: Let the backend own a secure refresh cookie and keep only the access
  token in frontend memory.
- **ALT-006**: **Rejection Reason**: Preferred long-term, but incompatible with the current OpenAPI
  request bodies for refresh and logout.

## Implementation Notes

- **IMP-001**: Validate every token and profile payload before exposing it to application state.
- **IMP-002**: Never include auth tokens in TanStack Query keys, persisted caches, logs or visible
  errors.
- **IMP-003**: Refresh-token rotation must replace the stored token atomically after a successful
  response.
- **IMP-004**: A failed refresh clears local identity before protected routes render.
- **IMP-005**: Tests cover login, restoration, rotation, remote logout and failed restoration.

## References

- **REF-001**: `POST /api/v1/auth/login`
- **REF-002**: `POST /api/v1/auth/refresh`
- **REF-003**: `POST /api/v1/auth/logout`
- **REF-004**: `GET /api/v1/users/me`
- **REF-005**: [ADR-0008](./adr-0008-tanstack-query-server-state.md)
