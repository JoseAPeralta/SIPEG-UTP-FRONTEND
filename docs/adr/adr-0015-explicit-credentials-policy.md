---
title: "ADR-0015: Explicit credentials policy for anonymous and session requests"
status: "Accepted"
date: "2026-10-06"
authors: "SIPEG-UTP Team"
tags: ["architecture", "decision", "security", "http", "privacy"]
supersedes: ""
superseded_by: ""
---

# ADR-0015: Explicit credentials policy for anonymous and session requests

## Status

**Accepted**

## Context

ADR-0013 moved the refresh token into an `HttpOnly` cookie and, to make refresh work from any tab,
set `credentials: "include"` on every request issued by `apiRequest`. That was correct while every
consumer was either auth or a private module, but the public agenda, the institutional catalogs and
the registration catalog are anonymous operations: sending the session cookie to them is
unnecessary, widens the exposure surface, and makes the public/private boundary depend on the
caller remembering to omit the token.

The OpenAPI contract is explicit about which operations need the browser cookie: `login` must be
able to receive it, `refresh` reads and rotates it, and `logout` revokes it. Public listings accept
no credentials at all, and a present but invalid Bearer token can even turn a public listing into
`401`/`403`.

## Decision

- Credentials follow the declared authentication mode of the operation:
  `auth.mode === "bearer"` keeps `credentials: "include"`; `auth.mode === "none"` uses
  `credentials: "omit"` by default.
- A caller can override the policy explicitly through `requestInit.credentials`; the explicit
  value wins over the default.
- `login`, `refresh` and `logout` declare `credentials: "include"` explicitly, because the cookie
  is the credential they manage.
- Public reads (agenda, catalogs, detail) never send the cookie and never send an `Authorization`
  header, even when a session exists in memory.

## Consequences

### Positive

- **POS-001**: Anonymous reads cannot leak or replay the session cookie.
- **POS-002**: The public/private boundary is expressed in the transport layer instead of relying
  on each adapter to remember the rule.
- **POS-003**: A public listing is no longer degraded to `401`/`403` by a stale cookie.

### Negative

- **NEG-001**: Every adapter must declare its auth mode correctly; a wrong `mode: "none"` silently
  turns an authenticated request anonymous.
- **NEG-002**: The auth adapter carries explicit overrides that must stay in sync with ADR-0013.

## Alternatives Considered

### Keep cookies on every request

- **ALT-001**: **Description**: Leave `credentials: "include"` universally.
- **ALT-002**: **Rejection Reason**: It sends a long-lived credential to anonymous endpoints that
  the contract does not authenticate, and it hides mistakes in the auth mode.

### Remove cookies and use only `sessionStorage` for refresh

- **ALT-003**: **Description**: Return the refresh token to JavaScript storage.
- **ALT-004**: **Rejection Reason**: Already rejected in ADR-0013; it exposes the credential to any
  XSS and breaks cross-tab restore.

## Implementation Notes

- **IMP-001**: `apiRequest` computes `requestInit?.credentials ?? (auth.mode === "none" ? "omit" : "include")`.
- **IMP-002**: `apiAuthAdapter` sets `credentials: "include"` on `login`, `refresh` and `logout`.
- **IMP-003**: The HTTP client tests assert the mode-derived policy and the explicit override.
- **IMP-004**: `pnpm run test:auth:browser` proves the cookie flow still works in a real browser.

## References

- **REF-001**: [ADR-0010](./adr-0010-public-administrative-query-boundaries.md)
- **REF-002**: [ADR-0012](./adr-0012-explicit-http-authentication-policy.md)
- **REF-003**: [ADR-0013](./adr-0013-httponly-refresh-cookie-cross-tab.md)
- **REF-004**: `src/app/adapters/http/apiClient.ts`
