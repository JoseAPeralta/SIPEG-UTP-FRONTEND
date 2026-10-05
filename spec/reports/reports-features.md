# Reports And Statistics - Features

## Problem

Operators need authoritative attendance and operational insight, but client-derived catalog totals and
unprotected exports can be incomplete or expose data outside the user's scope.

## Users

- Administrators.
- Collaborators with effective report permissions for a program or activity.

## Desired Outcome

Authorized users can inspect accessible metrics and download contract-supported reports whose values,
scope, and privacy come from the backend.

## In Scope

- `RPT-001` attendance figures filtered by organizational unit, program, activity, and date range when
  supported.
- `RPT-002` registration, presence, rate, occupancy, and certificate statistics.
- `RPT-003` dashboard using authoritative data and distinguishing unavailable from zero.
- `RPT-004` accessible tabular and semantic metric presentation.
- `RPT-005` protected Excel export.
- `RPT-006` protected PDF export.
- `RPT-007` independent permissions for report viewing and export.

## Out Of Scope

- Computing official figures from partial client catalogs.
- Adding a chart library without a concrete reporting need.
- Inventing report endpoints, filters, export formats, filenames, MIME types, or permission codes.

## Domain Rules

- Backend aggregates are authoritative for official figures.
- Every report and export is limited to the user's effective scope.
- Unavailable data is not displayed as zero.
- Export files and report PII are never placed in public or persistent caches.

## User Stories

### Inspect Scoped Metrics (`RPT-001`, `RPT-002`, `RPT-003`)

As an authorized operator, I want to filter trustworthy metrics so that I can understand participation
within my scope.

Acceptance criteria:

- Only contract-supported filters and metrics are shown.
- Program context includes its activities; activity context includes only that activity.
- Loading, unavailable, empty, zero, and error states remain distinct.

### Read Reports Accessibly (`RPT-004`)

As a report user, I want semantic tables and summaries so that the information works without relying
on a chart or color.

Acceptance criteria:

- Every visual summary has an equivalent labelled value or table.
- Dense data reflows or scrolls without losing headings and context.

### Export Authorized Data (`RPT-005`, `RPT-006`, `RPT-007`)

As an authorized operator, I want to export supported formats without exposing private data.

Acceptance criteria:

- View and export actions follow independently confirmed permissions.
- Downloads begin only from a contract-confirmed private response.
- Filename, media type, temporary URL cleanup, and errors use response metadata rather than guesses.

## Quality Requirements

- Reports are keyboard accessible, readable at 200% zoom, and usable at narrow widths.
- Filters do not place PII in URLs, logs, query keys, or persisted caches.
- Metric availability, scope, permissions, and download cleanup have automated tests.

## Dependencies

- Attendance, certificates, event programs, activities, and collaboration authorization.
- Backend aggregate report and export contracts.

## Open Questions

- Which metrics, filters, grouping dimensions, and date semantics are contractual?
- Which operations produce XLSX or PDF, and what download metadata do they return?
- Which permission values independently authorize viewing and export?
