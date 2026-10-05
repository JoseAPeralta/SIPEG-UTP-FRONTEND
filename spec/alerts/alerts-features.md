# Personal Alerts - Features

## Problem

Users need a private, consistent place to notice relevant system events without stale counters or
alerts from another identity.

## Users

- Authenticated participants, speakers, collaborators, and administrators.

## Desired Outcome

Each authenticated user can inspect and acknowledge only their own alerts, with an accurate unread
indicator and complete identity cleanup.

## In Scope

- `ALT-001` private paginated and filterable alert inbox.
- `ALT-002` accessible unread indicator in global navigation.
- `ALT-003` mark one or all alerts as read with safe optimistic behavior.
- `ALT-004` refresh policy and identity-scoped cleanup.

## Out Of Scope

- Inventing alert types, filters, polling intervals, or mutation operations.
- Email delivery and notification templates.
- Persisting alerts for offline use.

## Domain Rules

- Alerts are private to the authenticated identity and are never persisted offline.
- Internal links are shown only for destinations the current user can access.
- Optimistic read updates roll back if the backend rejects the change.
- Login, logout, or identity change discards all cached alert data.

## User Stories

### Notice And Review Alerts (`ALT-001`, `ALT-002`)

As an authenticated user, I want an unread count and inbox so that I can find relevant updates.

Acceptance criteria:

- The unread indicator has an accessible name and agrees with the current user's alert data.
- Inbox filters, pagination, labels, and destinations use only contract-confirmed values.
- An inaccessible destination is not exposed as an actionable internal link.

### Acknowledge Alerts (`ALT-003`, `ALT-004`)

As an authenticated user, I want to mark alerts read so that the inbox reflects what I reviewed.

Acceptance criteria:

- Individual and bulk actions are offered only when supported.
- A failed optimistic update restores the previous item and unread count.
- Session identity changes clear prior alerts before the next user can see them.

## Quality Requirements

- Counts and updates are announced without disruptive focus movement.
- Alert content is treated as untrusted text and cannot inject executable markup or external redirects.
- Inbox, optimistic rollback, count consistency, and identity cleanup have tests.

## Dependencies

- Authenticated identity, private query keys, and authorized internal routes.
- Backend alert list, unread count, and read-mutation contracts.

## Open Questions

- Contract-confirmed on 2026-10-05: the inbox filters by `type` and `isRead` with `page`/`limit`
  pagination, targets are `PROPOSAL | EVENT_PROGRAM | ACTIVITY | CERTIFICATE`, and read mutations are
  `PATCH /alerts/{id}/read` and `POST /alerts/read-all`. There is no dedicated unread-count
  operation; resolved on 2026-10-05 by 7.2: the indicator derives from
  `GET /api/v1/alerts?isRead=false&page=1` and projects `total`, so it never subcounts a paginated
  inbox.
- Resolved on 2026-10-05 by 7.3: the inbox lives at `/perfil/alertas`, and a destination link is
  offered only when the target appears in `GET /api/v1/users/me/scopes`; a received alert never
  authorizes by itself and an activity does not inherit access from its parent program. Only
  program and activity targets have an operational context today; proposals and certificates stay
  informative until their detail routes exist.
- Resolved on 2026-10-05 by 7.4: `PATCH /alerts/{id}/read` and `POST /alerts/read-all` are the only
  read mutations. Both are idempotent and take the recipient from the token. The inbox allows one
  read action per identity at a time, updates every cached page optimistically, restores the exact
  snapshot on failure and revalidates the identity scope on settle; the success message of "mark
  all" uses the server's `updatedCount`.
- The refresh strategy for 7.5 is still open against backend load and user expectations.
