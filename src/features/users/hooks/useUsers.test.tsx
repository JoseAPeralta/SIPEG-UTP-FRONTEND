import { waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createAppAdapters, type AppAdapters } from "@/app/adapters";
import { createQueryClient, queryKeys } from "@/app/query";
import { useSessionStore } from "@/store/session";
import { createAdminUser, createAuthenticatedUser, createAuthTokens } from "@/test/factories";
import { renderHookWithProviders } from "@/test/render";

import { useUsers } from "./useUsers";

function buildAdapters(overrides: Partial<AppAdapters> = {}): AppAdapters {
  return {
    ...createAppAdapters({ source: "mock" }),
    users: { loadUsers: vi.fn().mockResolvedValue([createAdminUser()]) },
    ...overrides,
  };
}

describe("useUsers", () => {
  afterEach(() => useSessionStore.getState().clearSession());

  it("should not query without a session", () => {
    const adapters = buildAdapters();
    const { result } = renderHookWithProviders(() => useUsers(), { adapters });

    expect(result.current.users).toBeNull();
    expect(adapters.users.loadUsers).not.toHaveBeenCalled();
  });

  it("should keep the administrative list under the identity key", async () => {
    useSessionStore.getState().setSession({
      currentUser: createAuthenticatedUser({ id: "admin-1" }),
      tokens: createAuthTokens(),
    });
    const queryClient = createQueryClient({ defaultOptions: { queries: { retry: false } } });
    const adapters = buildAdapters();
    const { result } = renderHookWithProviders(() => useUsers(), { adapters, queryClient });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.users).toEqual([createAdminUser()]);
    expect(adapters.users.loadUsers).toHaveBeenCalledTimes(1);
    expect(queryClient.getQueryData(queryKeys.administrativeUsers("admin-1"))).toEqual([
      createAdminUser(),
    ]);
  });

  it("should expose the loading failure", async () => {
    useSessionStore.getState().setSession({
      currentUser: createAuthenticatedUser({ id: "admin-1" }),
      tokens: createAuthTokens(),
    });
    const adapters = buildAdapters({
      users: { loadUsers: vi.fn().mockRejectedValue(new Error("usuarios caidos")) },
    });
    const { result } = renderHookWithProviders(() => useUsers(), { adapters });

    await waitFor(() => expect(result.current.error).not.toBeNull());

    expect(result.current.error?.message).toBe("usuarios caidos");
  });
});
