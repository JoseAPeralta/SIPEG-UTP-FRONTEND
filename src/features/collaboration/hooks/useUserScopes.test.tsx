import { waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createAppAdapters, type AppAdapters } from "@/app/adapters";
import { createQueryClient, queryKeys } from "@/app/query";
import { useSessionStore } from "@/store/session";
import { createAuthenticatedUser, createAuthTokens, createUserScope } from "@/test/factories";
import { renderHookWithProviders } from "@/test/render";

import { useUserScopes } from "./useUserScopes";

function buildAdapters(overrides: Partial<AppAdapters> = {}): AppAdapters {
  return {
    ...createAppAdapters({ source: "mock" }),
    userScopes: { loadUserScopes: vi.fn().mockResolvedValue([createUserScope()]) },
    ...overrides,
  };
}

describe("useUserScopes", () => {
  afterEach(() => useSessionStore.getState().clearSession());

  it("should not query without a session", () => {
    const adapters = buildAdapters();
    const { result } = renderHookWithProviders(() => useUserScopes(), { adapters });

    expect(result.current.scopes).toBeNull();
    expect(adapters.userScopes.loadUserScopes).not.toHaveBeenCalled();
  });

  it("should keep discovered non-public scopes under the identity key", async () => {
    useSessionStore.getState().setSession({
      currentUser: createAuthenticatedUser({ id: "user-1" }),
      tokens: createAuthTokens(),
    });
    const queryClient = createQueryClient({ defaultOptions: { queries: { retry: false } } });
    const draftScope = createUserScope({
      eventProgram: {
        id: "program-borrador",
        label: "En preparacion",
        name: "Programa en preparacion",
        status: "DRAFT",
      },
      id: "activity-draft-open-data",
      name: "Actividad en preparacion",
      status: "DRAFT",
      type: "activity",
    });
    const adapters = buildAdapters({
      userScopes: { loadUserScopes: vi.fn().mockResolvedValue([draftScope]) },
    });
    const { result } = renderHookWithProviders(() => useUserScopes(), { adapters, queryClient });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.scopes).toEqual([draftScope]);
    expect(adapters.userScopes.loadUserScopes).toHaveBeenCalledWith({});
    expect(queryClient.getQueryData(queryKeys.userScopes("user-1"))).toEqual([draftScope]);
  });

  it("should keep the type filter in the query key", async () => {
    useSessionStore.getState().setSession({
      currentUser: createAuthenticatedUser({ id: "user-1" }),
      tokens: createAuthTokens(),
    });
    const queryClient = createQueryClient({ defaultOptions: { queries: { retry: false } } });
    const adapters = buildAdapters();
    const { result } = renderHookWithProviders(() => useUserScopes({ type: "activity" }), {
      adapters,
      queryClient,
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(adapters.userScopes.loadUserScopes).toHaveBeenCalledWith({ type: "activity" });
    expect(queryClient.getQueryData(queryKeys.userScopes("user-1", { type: "activity" }))).toEqual([
      createUserScope(),
    ]);
  });

  it("should expose the loading failure", async () => {
    useSessionStore.getState().setSession({
      currentUser: createAuthenticatedUser({ id: "user-1" }),
      tokens: createAuthTokens(),
    });
    const adapters = buildAdapters({
      userScopes: { loadUserScopes: vi.fn().mockRejectedValue(new Error("scopes caidos")) },
    });
    const { result } = renderHookWithProviders(() => useUserScopes(), { adapters });

    await waitFor(() => expect(result.current.error).not.toBeNull());

    expect(result.current.error?.message).toBe("scopes caidos");
  });
});
