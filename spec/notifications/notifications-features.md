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

- Which owning operations accept notification intent, and what is the exact field and meaning?
- Does the backend report queued, sent, delivered, partial, or failed outcomes?
- Is proposal-form forwarding supported, and who controls the destination?
