---
title: "ADR-0007: Spanish Presentation Layer between API and UI"
status: "Accepted"
date: "2026-09-25"
authors: "SIPEG-UTP Team"
tags: ["architecture", "decision", "presentation", "localization", "adapters"]
supersedes: ""
superseded_by: ""
---

# ADR-0007: Spanish Presentation Layer between API and UI

## Status

**Accepted**

## Context

The OpenAPI contract exposes machine vocabulary in English: activity types and statuses, event
program statuses, classroom types and role codes. `ApiErrorResponse.message` is backend-authored
and its language is not guaranteed. The UI must always read in Spanish regardless of what the API
returns, but label resolution was scattered: inline ternaries in pages, a local `roleLabels` map
with a raw-code fallback, and errors that could include request paths.

The frontend is a downstream consumer of an evolving contract. The Adapter / Anti-Corruption Layer
pattern is the established recommendation for this boundary: map the external model into a model
the application owns, so external vocabulary does not leak into the UI (see Ducin's "Anti-Corruption
Layer in Frontend Development", the Model-Adapter pattern and the Azure Architecture Center). The
repository already applies the first boundary (HTTP adapter plus mappers, DTO to domain, ADR-0001).
This ADR adds the second boundary: domain to localized presentation.

## Decision

Translate contract vocabulary and error messages at the presentation edge, keeping domain codes
internal:

- Each feature owns typed label maps (`Record<Enum, string>`) in `features/<dominio>/model`
  (`catalogLabels`, `certificateLabels`, `classroomLabels`, `userLabels`), exported through its
  barrel. UI components render labels and never raw codes.
- Mappers reject enum values outside the contract before they reach the UI (`readEnum`), so a new
  backend value fails fast with a Spanish mapping error instead of leaking an English code.
- `ApiError` in `src/app/adapters/http/apiClient.ts` maps HTTP statuses and network failures to
  Spanish messages and never exposes the request path nor the backend `message`.
- Timestamps shown to users are formatted with `es-PA` (`formatDateTime`).
- Free-text backend content (names, descriptions, equipment, amenities, cancel reasons) is data,
  not UI copy, and is displayed as provided; it is explicitly out of scope for this layer.

## Consequences

### Positive

- **POS-001**: The UI always reads in Spanish even when the contract or backend messages change.
- **POS-002**: Label maps are typed, so adding a contract enum value breaks compilation until the
  Spanish label exists.
- **POS-003**: Error UX is consistent and does not leak technical paths or backend wording.
- **POS-004**: The mapping lives in one thin, testable place per feature instead of scattered
  ternaries.

### Negative

- **NEG-001**: New enum values require touching domain types, mappers, label maps and tests.
- **NEG-002**: Free-text fields may still arrive in another language; the frontend cannot translate
  arbitrary backend content.
- **NEG-003**: The layer adds small per-feature files and barrels.

## Alternatives Considered

### i18n library (react-i18next and similar)

- **ALT-001**: **Description**: Introduce a translation framework with resource files.
- **ALT-002**: **Rejection Reason**: The product ships in a single language; a full i18n runtime
  adds dependency and indirection without current benefit.

### Translate inside the HTTP adapters

- **ALT-003**: **Description**: Have adapters return Spanish strings instead of domain codes.
- **ALT-004**: **Rejection Reason**: Destroys the domain vocabulary needed for filtering, metrics
  and comparisons, and couples data logic to copy.

### Trust backend error messages

- **ALT-005**: **Description**: Show `ApiErrorResponse.message` directly in the UI.
- **ALT-006**: **Rejection Reason**: The backend may return English or technical wording; the
  frontend cannot guarantee Spanish.

### Map labels inside UI components

- **ALT-007**: **Description**: Keep inline ternaries and per-page maps.
- **ALT-008**: **Rejection Reason**: Duplicates vocabulary knowledge and allowed raw codes to leak
  through fallbacks.

## Implementation Notes

- **IMP-001**: Add a typed label map per feature when a new contract enum reaches the UI; never add
  a `?? code` fallback.
- **IMP-002**: Keep `ApiError.status` for programmatic handling and a Spanish `message` for users.
- **IMP-003**: Success criteria: no page renders a contract code or backend message, and label
  completeness tests plus `pnpm run api:mocks-check` stay green.

## References

- **REF-001**: `docs/adr/adr-0001-adapters-mock-api.md`
- **REF-002**: `docs/adr/adr-0006-api-first-data-source.md`
- **REF-003**: `src/app/adapters/http/apiClient.ts`
- **REF-004**: `features/*/model/*Labels.ts`
- **REF-005**: Anti-Corruption Layer in Frontend Development (Ducin); Model-Adapter pattern
  (Manca); Anti-Corruption Layer pattern (Azure Architecture Center)
