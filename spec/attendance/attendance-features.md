# Registration And Attendance - Features

## Problem

Participants need to register and understand their participation, while authorized operators need
reliable check-in without exposing codes or confusing registration with attendance.

## Users

- Authenticated participants.
- Administrators and collaborators authorized to operate attendance.

## Desired Outcome

Registration and check-in remain distinct, participants can manage their own activity list, and
operators can record attendance once through QR or manual entry.

## In Scope

- `ATT-001` registration for a specific activity.
- `ATT-002` own registrations, upcoming and completed activities, and contract-permitted cancellation.
- `ATT-003` QR code with a mandatory manual-code alternative.
- `ATT-004` assisted check-in for authorized staff.
- `ATT-005` administrative roster of registered and present participants.
- `ATT-006` duplicate prevention and program/activity working-context scope.

## Out Of Scope

- Assuming registration or attendance states, code formats, cancellation rules, or scanner libraries.
- Treating client-side checks as authoritative.
- Persisting attendance codes or private rosters offline.

## Domain Rules

- Registration and check-in are separate concepts even if represented by one backend resource.
- A registration without check-in is not presented as a final absence before the backend establishes it.
- QR and manual codes never appear in URLs, logs, query keys, or persistent storage.
- Program context includes its activities; activity context includes only that activity.

## User Stories

### Register And Manage My Activities (`ATT-001`, `ATT-002`)

As a participant, I want to register and review my activities so that I understand my current place.

Acceptance criteria:

- Availability and registration outcome come from the backend.
- Duplicate, unavailable, or cancelled cases preserve an actionable experience without raw errors.
- Cancellation is offered only under contract-confirmed conditions.

### Present My Attendance Code (`ATT-003`)

As a participant, I want a QR code and manual alternative so that staff can check me in reliably.

Acceptance criteria:

- The code is revealed only in an authenticated private view.
- Manual entry remains available when scanning is unsupported or fails.

### Record Attendance (`ATT-004`, `ATT-005`, `ATT-006`)

As an authorized operator, I want to find attendees and record check-in once within the selected scope.

Acceptance criteria:

- Simultaneous submissions are blocked and duplicate responses do not rewrite the prior record.
- The roster distinguishes registered and checked-in participants.
- Time, method, and operator are shown only if supplied by the contract.

## Quality Requirements

- Scanner and manual flows are keyboard accessible and provide announced feedback.
- Codes and roster PII are private, short-lived in the UI, and never persisted.
- Registration, cancellation, duplicate handling, scope, and check-in have automated tests.

## Dependencies

- Published activities, authenticated accounts, collaboration permissions, and working context.
- Backend contracts for registration, attendance, codes, rosters, and cancellation.

## Open Questions

- Which operations, states, code format, and cancellation rules are contractual?
- Which browser matrix must QR scanning support, and is a native scanner sufficient?
- Which roster fields and audit details may authorized operators see?
