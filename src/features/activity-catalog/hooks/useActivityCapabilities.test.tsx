import { waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { createAppAdapters, type AppAdapters } from "@/app/adapters";
import { useSessionStore } from "@/store/session";
import { createAuthenticatedUser, createAuthTokens, createUserScope } from "@/test/factories";
import { renderHookWithProviders } from "@/test/render";

import type { UserScope, UserScopePermission } from "@/features/collaboration";
import { useActivityCapabilities } from "./useActivityCapabilities";

const PROGRAM_ID = "program-1";
const ACTIVITY_ID = "activity-1";

function setSession(globalRole: "ADMIN" | "USER") {
  useSessionStore.getState().setSession({
    currentUser: createAuthenticatedUser({
      globalRole,
      id: `${globalRole.toLowerCase()}-1`,
    }),
    tokens: createAuthTokens(),
  });
}

function permission(name: string, window: Partial<UserScopePermission> = {}): UserScopePermission {
  return { name, origin: "LOCAL", validFrom: null, validUntil: null, ...window };
}

function adaptersWithScopes(scopes: UserScope[]): AppAdapters {
  const adapters = createAppAdapters({ source: "mock" });
  adapters.userScopes = { loadUserScopes: () => Promise.resolve(scopes) };

  return adapters;
}

function programScope(
  permissions: UserScopePermission[],
  overrides: Partial<UserScope> = {},
): UserScope {
  return createUserScope({ id: PROGRAM_ID, permissions, type: "program", ...overrides });
}

function activityScope(
  permissions: UserScopePermission[],
  overrides: Partial<UserScope> = {},
): UserScope {
  return createUserScope({
    eventProgram: { id: PROGRAM_ID, label: null, name: "Semana", status: "ACTIVE" },
    id: ACTIVITY_ID,
    permissions,
    type: "activity",
    ...overrides,
  });
}

describe("useActivityCapabilities", () => {
  afterEach(() => {
    useSessionStore.getState().clearSession();
  });

  it("should grant every capability, including cancellation, to an administrator", () => {
    setSession("ADMIN");

    const { result } = renderHookWithProviders(() =>
      useActivityCapabilities({ mode: "administration", programId: PROGRAM_ID }),
    );

    expect(result.current).toEqual({
      canCancel: true,
      canCreate: true,
      canDelete: true,
      canEdit: true,
      canRead: true,
      isResolving: false,
    });
  });

  it("should grant deletion from activity:delete independently of editing and cancellation", async () => {
    setSession("USER");
    const adapters = adaptersWithScopes([
      programScope([permission("activity:read"), permission("activity:delete")]),
    ]);

    const { result } = renderHookWithProviders(
      () => useActivityCapabilities({ mode: "operational", programId: PROGRAM_ID }),
      { adapters },
    );

    await waitFor(() => expect(result.current.canDelete).toBe(true));
    expect(result.current.canCancel).toBe(false);
    expect(result.current.canEdit).toBe(false);
  });

  it("should accept deletion from an exact activity scope", async () => {
    setSession("USER");
    const adapters = adaptersWithScopes([activityScope([permission("activity:delete")])]);

    const { result } = renderHookWithProviders(
      () =>
        useActivityCapabilities({
          activityId: ACTIVITY_ID,
          mode: "operational",
          programId: PROGRAM_ID,
        }),
      { adapters },
    );

    await waitFor(() => expect(result.current.canDelete).toBe(true));
  });

  it("should not grant deletion from update or cancel permissions", async () => {
    setSession("USER");
    const adapters = adaptersWithScopes([
      programScope([
        permission("activity:read"),
        permission("activity:update"),
        permission("activity:cancel"),
      ]),
    ]);

    const { result } = renderHookWithProviders(
      () => useActivityCapabilities({ mode: "operational", programId: PROGRAM_ID }),
      { adapters },
    );

    await waitFor(() => expect(result.current.canEdit).toBe(true));
    expect(result.current.canCancel).toBe(true);
    expect(result.current.canDelete).toBe(false);
  });

  it("should not grant deletion from an expired permission", async () => {
    setSession("USER");
    const adapters = adaptersWithScopes([
      programScope([
        permission("activity:delete", {
          validFrom: "2020-01-01T00:00:00.000Z",
          validUntil: "2020-12-31T00:00:00.000Z",
        }),
      ]),
    ]);

    const { result } = renderHookWithProviders(
      () => useActivityCapabilities({ mode: "operational", programId: PROGRAM_ID }),
      { adapters },
    );

    await waitFor(() => expect(result.current.isResolving).toBe(false));
    expect(result.current.canDelete).toBe(false);
  });

  it("should not grant deletion from a future permission", async () => {
    setSession("USER");
    const adapters = adaptersWithScopes([
      programScope([
        permission("activity:delete", {
          validFrom: "2999-01-01T00:00:00.000Z",
          validUntil: null,
        }),
      ]),
    ]);

    const { result } = renderHookWithProviders(
      () => useActivityCapabilities({ mode: "operational", programId: PROGRAM_ID }),
      { adapters },
    );

    await waitFor(() => expect(result.current.isResolving).toBe(false));
    expect(result.current.canDelete).toBe(false);
  });

  it("should not grant deletion from an unrelated scope", async () => {
    setSession("USER");
    const adapters = adaptersWithScopes([
      createUserScope({
        id: "program-other",
        permissions: [permission("activity:delete")],
        type: "program",
      }),
    ]);

    const { result } = renderHookWithProviders(
      () => useActivityCapabilities({ mode: "operational", programId: PROGRAM_ID }),
      { adapters },
    );

    await waitFor(() => expect(result.current.isResolving).toBe(false));
    expect(result.current.canDelete).toBe(false);
  });

  it("should grant editing without cancellation from activity:update", async () => {
    setSession("USER");
    const adapters = adaptersWithScopes([
      programScope([permission("activity:read"), permission("activity:update")]),
    ]);

    const { result } = renderHookWithProviders(
      () => useActivityCapabilities({ mode: "operational", programId: PROGRAM_ID }),
      { adapters },
    );

    await waitFor(() => expect(result.current.canEdit).toBe(true));
    expect(result.current.canCancel).toBe(false);
  });

  it("should grant cancellation without editing from activity:cancel", async () => {
    setSession("USER");
    const adapters = adaptersWithScopes([
      programScope([permission("activity:read"), permission("activity:cancel")]),
    ]);

    const { result } = renderHookWithProviders(
      () => useActivityCapabilities({ mode: "operational", programId: PROGRAM_ID }),
      { adapters },
    );

    await waitFor(() => expect(result.current.canCancel).toBe(true));
    expect(result.current.canCreate).toBe(false);
    expect(result.current.canEdit).toBe(false);
  });

  it("should accept cancellation from an exact activity scope", async () => {
    setSession("USER");
    const adapters = adaptersWithScopes([activityScope([permission("activity:cancel")])]);

    const { result } = renderHookWithProviders(
      () =>
        useActivityCapabilities({
          activityId: ACTIVITY_ID,
          mode: "operational",
          programId: PROGRAM_ID,
        }),
      { adapters },
    );

    await waitFor(() => expect(result.current.canCancel).toBe(true));
  });

  it("should not grant capabilities from an unrelated scope", async () => {
    setSession("USER");
    const adapters = adaptersWithScopes([
      createUserScope({
        id: "program-other",
        permissions: [permission("activity:cancel"), permission("activity:update")],
        type: "program",
      }),
    ]);

    const { result } = renderHookWithProviders(
      () => useActivityCapabilities({ mode: "operational", programId: PROGRAM_ID }),
      { adapters },
    );

    await waitFor(() => expect(result.current.isResolving).toBe(false));
    expect(result.current).toMatchObject({
      canCancel: false,
      canCreate: false,
      canEdit: false,
      canRead: false,
    });
  });

  it("should not grant cancellation from an expired permission", async () => {
    setSession("USER");
    const adapters = adaptersWithScopes([
      programScope([
        permission("activity:cancel", {
          validFrom: "2020-01-01T00:00:00.000Z",
          validUntil: "2020-12-31T00:00:00.000Z",
        }),
      ]),
    ]);

    const { result } = renderHookWithProviders(
      () => useActivityCapabilities({ mode: "operational", programId: PROGRAM_ID }),
      { adapters },
    );

    await waitFor(() => expect(result.current.isResolving).toBe(false));
    expect(result.current.canCancel).toBe(false);
  });

  it("should not grant cancellation from a future permission", async () => {
    setSession("USER");
    const adapters = adaptersWithScopes([
      programScope([
        permission("activity:cancel", {
          validFrom: "2999-01-01T00:00:00.000Z",
          validUntil: null,
        }),
      ]),
    ]);

    const { result } = renderHookWithProviders(
      () => useActivityCapabilities({ mode: "operational", programId: PROGRAM_ID }),
      { adapters },
    );

    await waitFor(() => expect(result.current.isResolving).toBe(false));
    expect(result.current.canCancel).toBe(false);
  });

  it("should not offer cancellation prematurely while discovery is resolving", () => {
    setSession("USER");
    const adapters = createAppAdapters({ source: "mock" });
    adapters.userScopes = { loadUserScopes: () => new Promise<UserScope[]>(() => undefined) };

    const { result } = renderHookWithProviders(
      () => useActivityCapabilities({ mode: "operational", programId: PROGRAM_ID }),
      { adapters },
    );

    expect(result.current.isResolving).toBe(true);
    expect(result.current.canCancel).toBe(false);
  });

  it("should retire a capability as soon as its window closes, without another response", async () => {
    setSession("USER");
    const adapters = adaptersWithScopes([
      programScope([
        permission("activity:read", {
          validUntil: new Date(Date.now() + 120).toISOString(),
        }),
      ]),
    ]);

    const { result } = renderHookWithProviders(
      () => useActivityCapabilities({ mode: "operational", programId: PROGRAM_ID }),
      { adapters },
    );

    await waitFor(() => expect(result.current.canRead).toBe(true));
    await waitFor(() => expect(result.current.canRead).toBe(false), { timeout: 3000 });
  });
});
