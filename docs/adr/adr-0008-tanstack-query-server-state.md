---
title: "ADR-0008: TanStack Query as the Server-State Layer"
status: "Accepted"
date: "2026-09-25"
authors: "SIPEG-UTP Team"
tags: ["architecture", "decision", "server-state", "tanstack-query", "caching", "offline"]
supersedes: ""
superseded_by: ""
---

# ADR-0008: TanStack Query as the Server-State Layer

## Status

**Accepted**

## Context

Server state was handled by a hand-written `useAsyncData` hook plus an `AppDataProvider` that loaded
the activity catalog and the operations read model once per session. That worked while there were
two read-only resources, but the roadmap adds users, activity CRUD, attendance, certificates and
reports: multiple screens sharing the same resource, mutations, invalidation, background
revalidation and offline support. Reimplementing deduplication, cache lifetime, retries and
mutation invalidation by hand would grow a custom data layer with no test economy. The PWA already
registers a service worker that caches the app shell but never API responses.

The adapter ports (`ActivityCatalogAdapter`, `OperationsAdapter`) remain the transport boundary
(ADR-0001); the missing layer is the server-state cache that observes them.

## Decision

Adopt **TanStack Query v5** as the server-state layer:

- `src/app/query` owns the `QueryClient` factory, the query keys, the persistence options, the
  provider and the devtools mount. Query keys are centralized so invalidation and persistence do not
  guess string literals.
- Feature hooks keep the loading, filtering and selection logic (repository rule) and call
  `useQuery`/`useMutation` over the injected adapters, returning the same shape as before
  (`data`, `error`, `isLoading`, `refetch`) so UI components stay unchanged.
- Shared defaults: `staleTime` 30 s, `gcTime` 5 min, one retry, no retry for `ApiError` 4xx,
  refetch on window focus. Tests create a fresh client with `retry: false` through
  `renderWithProviders`.
- `QueryProvider` wraps the app in `main.tsx`; React Query Devtools only render in development.
- Optional PWA persistence via `PersistQueryClientProvider` and a synchronous `localStorage`
  persister, enabled with `VITE_QUERY_PERSISTENCE=on`. Only successful queries whose key is the
  public catalog are dehydrated; the operations read model (users, attendance, certificates) is
  never persisted. `maxAge` is 24 h and `buster` follows `VITE_APP_VERSION`, so a deploy invalidates
  the cache.
- Logout clears the query client and removes the persisted cache.
- TanStack Router is not adopted now: React Router stays until the team decides to trade the
  rewrite for typed search params and loaders. TanStack Table and Form are candidates for the
  reports and forms work; TanStack DB is not justified without a local-first requirement.

## Consequences

### Positive

- **POS-001**: Cache, deduplication, stale-while-revalidate, retries and focus revalidation come
  from a maintained library instead of custom code.
- **POS-002**: Mutations get `invalidateQueries` and optimistic updates when the first write flows
  arrive.
- **POS-003**: Data loads lazily per view; `AppDataProvider` and `useAsyncData` are deleted.
- **POS-004**: Keys and persistence rules live in one place, so privacy is reviewable.
- **POS-005**: Adapters stay the only transport and mock/API seam; feature hooks keep their public
  shape.
- **POS-006**: The offline option reuses the existing PWA without caching API responses in the
  service worker.

### Negative

- **NEG-001**: A new runtime dependency and a v5-to-v6 migration in the future.
- **NEG-002**: Lazy loading changes startup behavior: each view can show its first loading state
  instead of an app-wide preload.
- **NEG-003**: Cache correctness now depends on disciplined query keys and invalidation.
- **NEG-004**: Persistence must be revisited whenever a new persisted key is added, because stored
  data outlives the session.

## Alternatives Considered

### Keep the custom `useAsyncData` and `AppDataProvider`

- **ALT-001**: **Description**: Extend the hook with options for retries, cache and mutations.
- **ALT-002**: **Rejection Reason**: Grows a bespoke data layer that the team must design, test and
  maintain for problems that Query already solves.

### SWR

- **ALT-003**: **Description**: Use SWR for fetching and revalidation.
- **ALT-004**: **Rejection Reason**: Comparable for reads, but TanStack Query offers a broader
  mutation, invalidation and persistence toolkit that matches the CRUD roadmap.

### Redux Toolkit Query

- **ALT-005**: **Description**: Move server state into Redux Toolkit Query.
- **ALT-006**: **Rejection Reason**: Pulls in Redux as a second global state system while Zustand
  already covers session and preferences.

### TanStack DB

- **ALT-007**: **Description**: Adopt the reactive client store with live queries and optimistic
  transactions.
- **ALT-008**: **Rejection Reason**: Still pre-1.0 and aimed at local-first or synchronized data;
  the product only needs a server-authoritative cache today.

### TanStack Router

- **ALT-009**: **Description**: Replace React Router with TanStack Router in the same change.
- **ALT-010**: **Rejection Reason**: The route rewrite is orthogonal to server state and can be
  decided separately; React Router already provides lazy routes and loaders.

## Implementation Notes

- **IMP-001**: Add a key in `src/app/query/queryKeys.ts` for every new resource and reuse it in
  hooks and invalidation; never inline the key.
- **IMP-002**: Keep adapters free of Query: hooks own the Query integration.
- **IMP-003**: When a persisted key is added, review `PERSISTED_QUERY_KEY_ROOTS` for privacy and
  document the change.
- **IMP-004**: After mutations, invalidate the affected keys; use `queryClient.clear()` only on
  logout or session changes.
- **IMP-005**: Tests must use `renderWithProviders` so every test gets an isolated `QueryClient`
  with retries disabled.

## References

- **REF-001**: [ADR-0001](./adr-0001-adapters-mock-api.md)
- **REF-002**: [ADR-0006](./adr-0006-api-first-data-source.md)
- **REF-003**: [ADR-0007](./adr-0007-capa-presentacion-espanol.md)
- **REF-004**: `src/app/query/`
- **REF-005**: `features/*/hooks/*` and `src/test/render.tsx`
- **REF-006**: TanStack Query persistence plugins documentation
