# Notifications - Features

## Problem

Users and attendees may need email updates after important actions, but the frontend cannot promise
delivery or expose notification choices until the backend contract defines them.

## Users

- Administrators and collaborators initiating documented actions.
- Registered attendees and proposal authors receiving backend-managed communication.

## Desired Outcome

The UI asks for a notification decision only when supported, submits the documented intent with the
owning action, and reports only outcomes the backend can confirm.

## In Scope

- `NTF-001` email notices initiated by contract-documented actions.
- `NTF-002` decision to notify registered attendees before activity modification, cancellation, or
  deletion when supported.
- `NTF-003` proposal feedback or resolution notices.
- `NTF-004` visible confirmation of documented notification outcomes.

## Out Of Scope

- SMTP, templates, recipient expansion, retries, queues, and delivery processing.
- Inventing a notification endpoint, boolean field, recipient list, delivery status, or email address.
- Claiming that an email was delivered when the backend only confirms the owning action.

## Domain Rules

- The backend owns recipients, templates, sending, retries, and delivery evidence.
- Notification controls appear only for contract-supported actions and authorized users.
- The frontend never accepts an arbitrary forwarding address unless the contract explicitly allows it.

## User Stories

### Choose Attendee Communication (`NTF-001`, `NTF-002`)

As an authorized organizer, I want to decide whether attendees are notified before a material activity
change so that communication follows the documented workflow.

Acceptance criteria:

- The choice is absent until the owning activity operation defines notification input and behavior.
- Confirmation identifies the affected action and does not overstate delivery.
- Cancelling the confirmation makes no mutation and sends no notification intent.

### Communicate Proposal Updates (`NTF-003`)

As a reviewer, I want proposal feedback or resolution to trigger documented communication.

Acceptance criteria:

- Notification behavior is tied to the contract-confirmed proposal action.
- Private content and recipient addresses are not exposed in logs or public UI.

### Understand The Result (`NTF-004`)

As an initiator, I want accurate feedback about notification handling.

Acceptance criteria:

- The UI distinguishes action success from notification outcome only when the response supports it.
- Unknown delivery remains unknown rather than being displayed as success.

## Quality Requirements

- Confirmation text, choices, and result messages are accessible and localized.
- PII and message content are excluded from logs, URLs, and persistent caches.
- Absence of contract support and each documented outcome have automated tests.

## Dependencies

- Activity and speaker-proposal mutations.
- Backend-owned notification and email infrastructure.

## Open Questions

- What is the exact name and type of the notification input, and which owning operations accept it?
- Is the input optional or required, and what does omitting it or each of its values mean?
- Which actions does it apply to: creation, edition, publication, cancellation or deletion?
- Who selects recipients, and can the frontend influence them beyond the contracted intent?
- Does the backend report queued, sent, delivered, partial, rejected or failed outcomes?
- What happens on success, rejection and repeated command execution?
- Which communication result may the UI present honestly?
- Is proposal-form forwarding supported, and who controls the destination?

## Contract Notes (2026-10-08)

The live contract was consulted on 2026-10-08. No activity operation publishes a notification input
or result:

| Operation                             | Published input              | Published result            | Notification                   |
| ------------------------------------- | ---------------------------- | --------------------------- | ------------------------------ |
| `POST /api/v1/activities`             | Activity creation data       | `201` with `ActivityDetail` | No contracted intent or result |
| `PATCH /api/v1/activities/{id}`       | Editable fields and `status` | `200` with `ActivityDetail` | No contracted intent or result |
| `POST /api/v1/activities/{id}/cancel` | Optional reason              | `200` with `ActivityDetail` | No contracted intent or result |
| `DELETE /api/v1/activities/{id}`      | No body                      | `204` without body          | No contracted intent or result |

- Directed searches for `notifyAttendees` and `notification` returned no operations.
- No request declares `notifyAttendees`; every published JSON body uses `additionalProperties: false`.
- `ActivityDetail` never declares delivery, queue, recipient or send results.
- `DELETE` accepts no body.
- The response envelope carries a free-text `message`; it is not a notification promise.

The absence of these fields does not prove that the backend never performs automatic communications.

## 5.8 Notification Block (2026-10-08)

The 5.8 delivery verified the block; it did not implement the ability to notify.

- `NTF-002` remains pending contract: the input, its obligatoriness, its meaning and the
  backend-managed recipient selection are not published.
- `NTF-004` remains pending contract: no operation reports a notification outcome.
- Success announcements confirm only the completed operation (create, edit, publish, unpublish,
  cancel or delete). The free-text `message` of the envelope is never presented as evidence of
  delivery.
- Request allowlists discard `notifyAttendees`, including `false`, and neither the forms nor the
  lifecycle confirmations expose a notification control.

Conditions to review the block in a later phase, once the owning operation documents:

1. Exact name and type of the input.
2. Whether it is optional or required.
3. Meaning of omitting it and of each of its values.
4. Actions it applies to.
5. Recipient selection, managed by the backend.
6. Success, rejection and repetition effects of the command.
7. Which communication outcome the UI may honestly present.

If the contract only confirms the action, the UI will keep not claiming email delivery.

### Test Evidence (2026-10-08)

- Checker `scripts/check-mock-contract.test.mjs`: "should declare the 5.8 notification block on every
  activity write body", the drift cases that report an optional or required `notifyAttendees` in the
  creation, update and cancellation bodies, the case where `additionalProperties` stops being `false`,
  the case that requests a review when the request schema cannot be inspected, and the deletion
  expectation of `204` without content and without request body. The failure message is «El contrato
  de la operación cambió: revise el bloqueo de notificación de 5.8 antes de integrar nuevos campos.»
- HTTP journey `src/features/activity-catalog/ui/ActivityNotificationBoundary.test.tsx`: edit with
  diff and localized announcement, publication/unpublication/cancellation with exclusive bodies,
  deletion with `204` and no body, recovery from a `409` by reading without resending, a discarded
  confirmation that issues no command, and an envelope `message` about sent emails that is never
  presented as a delivery result.
- Adapter and UI suites mirror the boundary: `apiActivitiesAdapter.test.ts`,
  `mockActivitiesAdapter.test.ts`, `ActivityForm.test.tsx`, `ActivityDetailView.test.tsx`,
  `ProgramActivitiesView.test.tsx` and `ActivityLifecycleConfirmation.test.tsx` assert the absence of
  notification controls and of fabricated results, and the matching stories repeat the assertions.

This evidence is green in the targeted 5.8 suites; the final baselines, inventory and `check` gate
still runs when the phase closes.
