# Certificates - Features

## Problem

Eligible participants need private proof of attendance, while operators need safe individual and bulk
generation without duplicate records or assumptions about backend automation.

## Users

- Participants accessing their own certificates.
- Administrators and authorized collaborators generating certificates.

## Desired Outcome

Eligibility is understandable, issuance is idempotent, bulk outcomes are explicit, and certificate
files remain private throughout generation and download.

## In Scope

- `CER-001` eligibility lookup and explanation.
- `CER-002` idempotent individual generation.
- `CER-003` bulk generation from an activity attendance list.
- `CER-004` automatic generation only when the backend defines it.
- `CER-005` My Certificates listing and authenticated private download.
- `CER-006` certificate and alert refresh after issuance.

## Out Of Scope

- Inventing certificate states, automatic jobs, templates, file URLs, or generation operations.
- Generating certificate documents in the browser.
- Persisting files or certificate data in the public offline cache.

## Domain Rules

- Backend eligibility and authorization are authoritative.
- Repeating an individual generation request must not create a duplicate visual record.
- Temporary browser download URLs are revoked after use.
- Certificate files and private metadata are cleared from client caches on logout.

## User Stories

### Understand Eligibility (`CER-001`)

As an operator, I want to see who is eligible and why others are not so that generation is predictable.

Acceptance criteria:

- Eligibility and reasons are shown only when supplied by the backend.
- Ineligible entries cannot be submitted as if they were eligible.

### Generate Certificates (`CER-002`, `CER-003`, `CER-004`, `CER-006`)

As an authorized operator, I want individual and bulk issuance with clear outcomes.

Acceptance criteria:

- Individual generation is presented idempotently.
- Bulk generation summarizes generated, already-existing, and failed results only when the contract
  distinguishes them.
- Automatic generation is described or surfaced only after contract confirmation.
- Successful issuance refreshes affected certificate and alert queries.

### Access My Certificates (`CER-005`)

As a participant, I want to find and download my own certificate securely.

Acceptance criteria:

- The list is restricted to the authenticated user's authorized records.
- Download uses a private response and does not expose PII or credentials in a URL.

## Quality Requirements

- Progress, partial outcomes, errors, and download state are announced accessibly.
- Certificate data and files are never persisted offline or logged.
- Eligibility, idempotency, bulk summaries, download cleanup, and authorization have tests.

## Dependencies

- Attendance records, accounts, alerts, file delivery, and collaboration authorization.
- Backend certificate eligibility, generation, list, and download contracts.

## Open Questions

- Which eligibility rules, generation operations, states, and result fields are contractual?
- Does automatic generation exist, and what event triggers it?
- How are bulk progress, partial failure, and authenticated file delivery represented?
