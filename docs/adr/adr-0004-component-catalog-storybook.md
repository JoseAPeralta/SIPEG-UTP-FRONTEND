---
title: "ADR-0004: Component Catalog, Mechanical Inventory and Visual Baselines"
status: "Accepted"
date: "2026-09-25"
authors: "SIPEG-UTP Team"
tags: ["architecture", "decision", "storybook", "components", "testing"]
supersedes: ""
superseded_by: ""
---

# ADR-0004: Component Catalog, Mechanical Inventory and Visual Baselines

## Status

**Accepted**

## Context

Reusable UI must be discoverable and consistent so pages compose existing components instead of
duplicating markup. Hand-written component documentation drifts from code, agents need a mechanical
catalog to find contracts and states, and visual or accessibility regressions are easy to miss in
review. Visual identity is defined separately in `DESIGN.md`.

## Decision

Colocate `*.stories.tsx` files with components and render them with Storybook 10
(`@storybook/react-vite`) plus the docs, a11y and MCP addons. `pnpm run storybook:build` emits the
static catalog and the MCP manifest under `storybook-static/`.
`scripts/generate-component-inventory.mjs` generates the versioned `docs/components/INVENTORY.md`
and `docs/components/generated-inventory.json`; `pnpm run components:inventory:check` fails when the
inventory is stale. `pnpm run test:storybook` builds and serves Storybook, runs story `play`
functions through the test runner, and checks accessibility with axe plus visual baselines with
Playwright stored in `.storybook/__image_snapshots__`. Visual changes require an explicit,
reviewed `pnpm run test:storybook:update`. New reusable components need a catalog entry and a story,
with a `play` assertion when they have meaningful interaction. `DESIGN.md` remains the visual source
of truth.

## Consequences

### Positive

- **POS-001**: Components, their props and their states are mechanically discoverable.
- **POS-002**: Inventory drift is detected in CI instead of during review.
- **POS-003**: Accessibility violations and visual regressions are caught by tests.
- **POS-004**: Reuse is cheaper than duplication for both humans and agents.
- **POS-005**: The catalog is consumable through MCP without loading the whole build into context.

### Negative

- **NEG-001**: Storybook build and browser tests add CI time.
- **NEG-002**: Visual baselines depend on the pinned Chromium version and rendering environment.
- **NEG-003**: Contributors must update stories, tests and inventory together.
- **NEG-004**: The MCP catalog requires a running Storybook server.

## Alternatives Considered

### Manual component documentation

- **ALT-001**: **Description**: Maintain a hand-written catalog of components and props.
- **ALT-002**: **Rejection Reason**: Drifts from code and cannot be verified mechanically.

### MCP catalog without a versioned inventory

- **ALT-003**: **Description**: Rely only on the live Storybook MCP endpoint.
- **ALT-004**: **Rejection Reason**: Leaves no PR diff, no offline discovery and no drift detection.

### Hosted visual review services (for example Chromatic)

- **ALT-005**: **Description**: Upload snapshots to an external visual testing service.
- **ALT-006**: **Rejection Reason**: Adds an external dependency, cost and remote upload; local
  Playwright baselines keep the check self-contained.

### No visual regression tests

- **ALT-007**: **Description**: Rely on unit and interaction tests only.
- **ALT-008**: **Rejection Reason**: Styling and layout regressions pass unnoticed.

## Implementation Notes

- **IMP-001**: Update contract, stories, tests and catalog together when component behavior changes.
- **IMP-002**: Inspect intentional visual changes before running `pnpm run test:storybook:update`
  and commit the updated baselines.
- **IMP-003**: Run `pnpm run components:inventory` after changing stories and keep the generated
  files versioned; use `components:inventory:generate` when the static build is already current.
- **IMP-004**: Keep `DESIGN.md` authoritative for tokens and visual identity.
- **IMP-005**: Automated runs serve the static catalog on `127.0.0.1:6007`; `6006` stays reserved for
  the interactive dev server and the MCP catalog, so a test run never depends on an unrelated
  process.
- **IMP-006**: Only the test runner fails on a broken `play` function. Storybook renders a failed
  `play` in the console and leaves the story root unchanged, so axe and the visual baseline both
  pass; `test-storybook` must stay in the full suite.
- **IMP-007**: Prefer `storybook:test:affected` with explicit story ids during editing. The ids are
  validated before the run, and the build is reused unless a source is newer.

## References

- **REF-001**: `docs/components/README.md`
- **REF-002**: `DESIGN.md`
- **REF-003**: `.storybook/main.ts`
- **REF-004**: `package.json` (storybook scripts)
