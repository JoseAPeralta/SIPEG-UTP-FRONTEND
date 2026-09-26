# AGENTS.md

## Project Overview

- **Type/Scope**: React frontend web application only.
- **Backend**: separate Node.js API in the sibling `../SIPEG-UTP-BACKEND` repository/folder.
- **Product goal**: event management platform for users, events, attendance, certificates, classrooms, speaker registration, reports, and statistics.
- **Entry point**: `src/main.tsx`; main router: `src/App.tsx`.
- **Stack**: React 19, TypeScript 6, Vite, Vitest, Testing Library, Chakra UI v3, React Router v8, Zustand, TanStack Query v5.
- **Package manager**: pnpm 12.5.1.

## Development Commands

```bash
pnpm install
pnpm run dev
pnpm run build
pnpm run verify:quick
pnpm run check
pnpm run test:storybook
pnpm run test:harness
```

## Project Structure

```txt
src/
├── app/adapters/       # Puertos, contexto, cliente HTTP (http/) y composition root
├── app/query/          # Cliente TanStack Query, claves, persistencia offline y provider
├── components/         # ui/ y layout/
├── data/mock/          # Datos de demostracion por dominio
├── features/<dominio>/ # model, adapters, hooks, ui y barrel
├── hooks/              # Hooks transversales (si aparece uno que no pertenece a una feature)
├── pages/  pwa/  store/  styles/
├── test/               # Factories y render con providers
├── theme/  types/  utils/
├── App.tsx
├── main.tsx
└── setupTests.ts
```

## Import Aliases

`@` -> `src/`, `@components` -> `src/components/`, `@pages` -> `src/pages/`, `@store` -> `src/store/`, `@hooks` -> `src/hooks/`, `@utils` -> `src/utils/`, `@theme` -> `src/theme/`.

## Frontend Rules

- This repository must stay frontend-only: do not add backend API code, Node.js controllers, database models, migrations, queues, mailers, or server routes here.
- Keep UI components separate from API request logic.
- Use TypeScript for all frontend code.
- Use Chakra UI v3 patterns; use `gap` instead of `spacing` in Chakra stack components.
- Use Zustand only for shared frontend state (session, unit preference, working context); prefer local component state otherwise.
- Keep route-level views in `src/pages`.
- Keep reusable UI and layout components in `src/components` (`ui/` and `layout/`).
- Keep pure helpers in `src/utils` and domain logic in `features/<dominio>/model`.
- Keep custom hooks with their feature; `src/hooks` is only for cross-cutting hooks.
- Use the backend vocabulary: `OrganizationalUnit`, `EventProgram`, `Activity`. The official resource is `activities`; there is no `/events` resource.
- UI copy is Spanish: render the typed label maps in `features/<dominio>/model/*Labels.ts` for contract enums and never show raw API codes or backend error messages. Free-text backend content (names, descriptions, equipment) is shown as-is.
- Every activity belongs to exactly one event program, and every event program belongs to exactly one organizational unit.

## Architecture Rules

- Adapter ports live in `src/app/adapters/contracts.ts`; `createAppAdapters` is the only composition root and selects mock or API through `VITE_DATA_SOURCE` (`api` by default; `mock` is reserved for tests, Storybook and offline work).
- Server state lives in TanStack Query: `src/app/query` owns the client, the query keys and the optional persistence, and feature hooks call `useQuery`/`useMutation` over the injected adapters. Components never call adapters directly and never inline query keys.
- Only `PERSISTED_QUERY_KEY_ROOTS` keys may be dehydrated to `localStorage`; never persist session, user or operations read models. Review the list before adding a persisted key. Logout must clear the query client and the persisted cache.
- Only adapters and their tests may import `src/data/mock`; pages, components and hooks must not. `src/architecture.test.ts` enforces this.
- The HTTP adapter must follow the OpenAPI contract and validate payloads before exposing them.
- Hooks own loading, filtering, pagination and selection logic; UI components receive props and callbacks.
- Connected feature views may call a feature hook; pages stay thin.
- Use explicit barrels (`src/components`, `features/*`) for public imports; cross-feature imports always use the other feature's barrel. Internal files import their direct neighbor to avoid cycles. Lazy-loaded pages keep direct imports.
- Do not create a global `src/index.ts` barrel.

## Component Reuse Workflow

- Before creating UI, consult `docs/components/README.md` and the generated `docs/components/INVENTORY.md`, then prefer composing an existing component over copying markup or creating a near-duplicate.
- Keep cross-domain UI in `src/components`; keep domain-specific UI in `src/features/<domain>/ui` even when several pages reuse it.
- Import reusable components through `@/components` or the owning feature barrel; files inside the same component module may import direct neighbors.
- Public props use an exported TypeScript type; document intent, invariants, defaults and provider requirements rather than obvious syntax.
- A new reusable component needs a catalog entry and a colocated `*.stories.tsx`, plus a `play` assertion when it has meaningful interaction; update contract, stories, tests and catalog together when behavior changes.
- After changing stories, run `pnpm run components:inventory`; keep visual changes explicit by inspecting the result before `pnpm run test:storybook:update` and committing the updated baselines.
- Do not add a new abstraction only to satisfy the catalog; private, single-use composition may remain local to its parent.

## Testing Rules

- Test runner: Vitest; environment: jsdom; setup file: `src/setupTests.ts`.
- Colocate every test next to the file it tests; do not create `__tests__` directories.
- Use `src/test/factories.ts` for data and `renderWithProviders` / `renderHookWithProviders` from `src/test/render.tsx` for providers.
- Prefer Testing Library with semantic queries; add tests for meaningful behavior: pure functions, mappers, adapters, hooks and UI.
- Run `pnpm run verify:quick` in the agent inner loop and `pnpm run check` before integration; both include `pnpm test` for new or modified behavior.
- Run `pnpm run test:storybook` when adding or modifying component stories or visual behavior; `pnpm run storybook:build` validates Autodocs, the MCP manifest and the static component catalog.
- Run `pnpm run components:inventory:check` after building Storybook to detect stale generated documentation.
- Run `pnpm run build` before considering large frontend changes complete.
- Run `pnpm run test:harness` when changing harness scripts or isolation behavior; the `harness-isolation` CI job runs it too.

## Backend Boundary

- The backend is a separate Node.js API project in `../SIPEG-UTP-BACKEND`.
- The frontend never modifies the backend: it only reads the live API contract.
- Backend-specific instructions belong in the backend repository/folder.
- This frontend should later consume the backend through a clear API client layer.
- Do not hardcode backend URLs directly inside components.

## API Contract Workflow

- Before adding or changing frontend HTTP integration, consult the relevant OpenAPI operation with `pnpm run api:contract -- search <text>` and `pnpm run api:contract -- get <METHOD> <PATH>`.
- The default source is the running backend at `http://localhost:3000/api/openapi.json`; override with `--source` or `SIPEG_OPENAPI_SOURCE` only for a local OpenAPI document or a different loopback backend.
- Query only the relevant operation; do not fetch `/api/docs` or load the complete OpenAPI document into model context.
- Treat OpenAPI as the contract source; do not invent request fields, response fields, authentication requirements or status codes.
- When OpenAPI changes, update `src/types/domain.ts`, the feature mappers, `src/data/mock` and their tests in the same change; validate with `pnpm run api:mocks-check` against the running backend (it is not part of CI).
- The backend is read-only from this repository: never modify backend files, only read the contract. Make backend changes only in a separate backend task and repository context.
- Do not execute state-changing API requests unless the user explicitly asks.

## Agent Guidelines

- Inspect existing files before editing; preserve existing user changes; make the smallest correct change; keep frontend and backend concerns separated.
- Do not add libraries unless there is a concrete reason.
- Prefer clear domain naming for users, organizational units, careers, permissions, event programs, activities, attendance, classrooms, speakers, certificates, and reports.
- When implementing frontend features, consider future integration with the separate Node.js API.

## Local Harness Safety

- Harness agents must work only in a workspace created by `scripts/prepare-agent-workspace.sh`.
- Run local agent commands through `scripts/run-agent-sandbox.sh`.
- Do not provide agents with GitHub connectors, tokens, SSH credentials, MCP servers, credential helpers, or remote repository tools.
- Harness agents must not access GitHub or any other Git remote under any circumstances.
- Harness agents must not run Git commands or create commits.
- A trusted local operator may create a local commit only after an explicit user request.
- A request to create a local commit never authorizes a push or any other remote operation.

## Documentation Map

- Index: `docs/README.md`; product features: `docs/product/features.md`.
- Component catalog: `docs/components/README.md`; visual identity: `DESIGN.md`.
- Domain: `CONTEXT.md`; architecture decisions: `docs/adr/`; security: `docs/security/`.
- Harness workflow: `harness/README.md` and `spec/README.md`.
