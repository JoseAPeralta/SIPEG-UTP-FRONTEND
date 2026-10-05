---
title: "ADR-0013: HttpOnly refresh cookie and cross-tab session coordination"
status: "Accepted"
date: "2026-09-30"
authors: "SIPEG-UTP Team"
tags: ["architecture", "decision", "authentication", "security", "session"]
supersedes: "adr-0009-auth-session-token-storage"
superseded_by: ""
---

# ADR-0013: HttpOnly refresh cookie and cross-tab session coordination

## Status

**Accepted**

Implementation corrected on 2026-10-02: explicit POST operations, guarded restoration,
identity/cache convergence, cross-tab Web Locks and visible logout retry on server failure.

Supersedes [ADR-0009](./adr-0009-auth-session-token-storage.md).

## Context

ADR-0009 kept the refresh token in `sessionStorage` as a deliberate compromise, with the explicit
condition that "that contract change will supersede the `sessionStorage` compromise". The backend has
now made that change (backend ADR-0009): the refresh token travels in an `HttpOnly` cookie and no
longer appears in any response body.

The compromise had two defects that the product hits constantly:

- **`sessionStorage` is scoped to one tab.** Opening a second tab of the same browser demanded a new
  login even though a valid credential existed. Event organizers work across several tabs at once.
- **JavaScript could read the token.** Any successful XSS in the frontend origin could exfiltrate a
  seven-day credential.

Moving to the cookie also removed the `sessionStorage` bookkeeping, but left coordination unanswered:
each tab now shares one rotating credential, and the rotating part creates races that `sessionStorage`
never had. Better Auth rotation replaces `sessions.token` atomically, so the loser of a race gets 401
while the winner holds the only valid cookie.

## Decision

- **No Web Storage.** The refresh token is never readable by JavaScript. `sessionStorage` and
  `localStorage` are not used for credentials. The access token lives in Zustand memory only.
- **Send cookies on every request.** `apiRequest` always sets `credentials: "include"`. Without it the
  cookie never reaches the API and refresh fails with 401.
- **One coordinator per adapter.** `SessionCoordinator` owns the refresh cycle and is shared by the
  login flow and the bootstrap flow, so a tab cannot run two competing refreshes.
- **Single-flight within a tab.** Concurrent callers await the same in-flight refresh instead of each
  starting their own rotation.
- **Web Locks across tabs.** The HTTP auth adapter serializes login, refresh, logout and password
  changes using a lock scoped by API origin. The lock lasts until the response has been consumed.
  This coordinates tabs sharing the same frontend origin, not unrelated frontend origins.
- **An epoch guards identity changes.** If a login starts or logout completes while a refresh is in flight, the
  epoch changes and the refresh result is discarded instead of resurrecting a session the user just
  ended.
- **Transient and terminal failures are distinguished.** A network error or 5xx must not sign the
  user out; only a definitive rejection ends the session.
- **Bounded compatibility retry.** Without Web Locks, a refresh returning 401 waits 150 ms and
  retries once, allowing a concurrent response to install its rotated cookie. This fallback does
  not guarantee mutual exclusion. The optional HTTP `sessionRefresh` hook is separate.
- **`BroadcastChannel` announces session changes.** Login, refresh and logout are announced so other
  tabs learn that the session changed without polling. This is a notification channel, not a lock: the
  cookie stays the single source of truth and a tab never trusts a peer for authorization.
- **Confirmed logout.** A successful POST logout ends all listening tabs and clears identity-scoped
  caches. A failed revocation stays visible with a retry action instead of pretending success.
- **Transient recovery.** Proactive refresh retries network/5xx/429 failures after 30 seconds.
  Focus, visibility and online events can restore an anonymous tab or renew an expiring token.

## Consequences

### Positive

- **POS-001**: A new tab restores the session through a refresh call alone; no second login.
- **POS-002**: A successful XSS can no longer read a long-lived credential.
- **POS-003**: A confirmed logout removes the shared cookie and clears listening tabs in the same
  browser profile. Previously issued stateless access JWTs remain valid until expiry.
- **POS-004**: A transient network failure no longer signs the user out.
- **POS-005**: Login and logout racing an in-flight refresh can no longer resurrect a session.

### Negative

- **NEG-001**: Auth-path requests carry a cookie the frontend cannot inspect, which removes any client-side
  view of the refresh deadline. The deadline comes from the response body instead.
- **NEG-002**: Web Locks requires a supporting browser and secure context (HTTPS or localhost).
  Without it, simultaneous refreshes can still collide despite the bounded retry.
- **NEG-003**: `BroadcastChannel` is unavailable in some older browsers; the guard degrades to
  per-tab behaviour, which is the old behaviour rather than a failure.

## Alternatives Considered

### Keep sessionStorage and Sync Across Tabs

- **ALT-001**: **Description**: Keep the token in `sessionStorage` and replicate it to other tabs via
  `storage` events.
- **ALT-002**: **Rejection Reason**: Replicating a JavaScript-readable credential between tabs is
  exactly the exposure `HttpOnly` removes, and a write from one tab overwrites the others mid-rotation.

### Store the Access Token in Web Storage

- **ALT-003**: **Description**: Persist the access token so a reload skips the refresh.
- **ALT-004**: **Rejection Reason**: It moves a credential into JavaScript-readable storage for a
  marginal gain in latency, and the access token cannot be revoked before it expires.

### Coordinate Refresh Across Tabs with a Lock (adopted on 2026-10-02)

- **ALT-005**: **Description**: Hold a `Web Locks` or leader-election lock so only one tab rotates the
  cookie at a time.
- **ALT-006**: **Adoption Reason**: A collision is not guaranteed to self-heal before a tab treats
  the 401 as terminal. Native Web Locks prevents concurrent rotation without exposing credentials.

## Implementation Notes

- **IMP-001**: Never put tokens in TanStack Query keys, persisted caches, logs or visible errors.
- **IMP-002**: Refresh rotates the cookie server-side; the client only reads the new access token.
- **IMP-003**: A failed terminal refresh clears identity before protected routes render.
- **IMP-004**: The 401 retry is bounded to one attempt per request.
- **IMP-005**: Tests cover login, cross-tab restore, rotation, the epoch race, transient classification,
  single-flight and remote logout.
- **IMP-006**: `pnpm run test:auth:browser` checks native cookies, BroadcastChannel and Web Locks
  in Chromium using the real auth modules and a simulated rotating API. Hook tests cover store/cache
  synchronization and restoration; this browser fixture does not mount the React app or use a database.
