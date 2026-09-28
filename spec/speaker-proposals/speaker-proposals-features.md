# Speaker Proposals - Features

## Problem

Prospective speakers need a safe way to submit and follow proposals, while reviewers need scoped
workflows that protect CVs, preserve versions, and avoid implicit activity creation.

## Users

- Prospective and returning speakers.
- Administrators and program collaborators reviewing proposals.

## Desired Outcome

A proposal can move from public submission through feedback and resolution with private files,
traceable versions, and contract-defined author identity.

## In Scope

- `SPP-001` public proposal form capturing first name, last name, email, CV, approximate duration,
  talk type, title, content, submission date, and target event program when contract-supported.
- `SPP-002` eligible event-program selection.
- `SPP-003` safe confirmation and author follow-up.
- `SPP-004` scoped administrative inbox with program, state, and date filters when supported.
- `SPP-005` immutable version history and text or image feedback when supported.
- `SPP-006` explicit proposal resolution without implicit activity creation.
- `SPP-007` speaker catalog and optional account linking.
- `SPP-008` privacy of CVs and proposal files.

## Out Of Scope

- Inventing anonymous identity tokens, proposal states, upload operations, or resolution payloads.
- Automatically creating an activity from an approved proposal.
- Sending email from the frontend or forwarding to an arbitrary address without a contract.

## Domain Rules

- Only eligible programs supplied by the backend can receive proposals.
- CVs and private attachments are never placed in public caches, logs, query keys, or guessable URLs.
- Previous proposal versions remain distinguishable from the current version.
- Reviewer access follows effective program scope.

## User Stories

### Submit And Follow A Proposal (`SPP-001`, `SPP-002`, `SPP-003`, `SPP-008`)

As a speaker, I want to submit to an eligible program and follow the result without exposing private
files.

Acceptance criteria:

- The form submits only contract-confirmed fields and validates files against documented limits.
- A program that becomes ineligible produces recoverable feedback without discarding safe input.
- Confirmation and later access use only the identity mechanism defined by the backend.

### Review Proposals (`SPP-004`, `SPP-005`)

As an authorized reviewer, I want to filter proposals and review their history so that feedback is
based on the correct version.

Acceptance criteria:

- Inbox filters and visible records respect effective program scope.
- Current content, prior versions, and feedback are clearly distinguished.

### Resolve And Organize Speakers (`SPP-006`, `SPP-007`)

As an authorized reviewer, I want to resolve proposals and maintain speaker references explicitly.

Acceptance criteria:

- Resolution requires confirmation and uses only contract-supported actions.
- Approval does not create an activity unless a future contract explicitly defines that behavior.
- Account linking is offered only when supported and authorized.

## Quality Requirements

- File controls work without drag and drop and announce validation, progress, and failure.
- Proposal and speaker data is private and identity-scoped.
- Submission, conflict recovery, versions, scope, and resolution have automated tests.

## Dependencies

- Event programs, collaboration authorization, alerts, and notifications.
- Backend contracts for proposals, speakers, uploads, author identity, and feedback.

## Open Questions

- Which proposal fields, states, filters, and lifecycle operations are contractual?
- How does an unauthenticated author securely view or edit a proposal?
- What upload limits and download authorization apply to CVs and feedback images?
- Is email forwarding supported, and how is its destination controlled?
