import { act, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createAppAdapters, type AppAdapters } from "@/app/adapters";
import { createQueryClient, queryKeys } from "@/app/query";
import { useSessionStore } from "@/store/session";
import { createAdminUser, createAuthenticatedUser, createAuthTokens } from "@/test/factories";
import { renderHookWithProviders } from "@/test/render";

import { useUserMutations } from "./useUserMutations";

function buildAdapters(overrides: Partial<AppAdapters> = {}): AppAdapters {
  return {
    ...createAppAdapters({ source: "mock" }),
    users: {
      createUser: vi.fn().mockResolvedValue(createAdminUser({ id: "user-9" })),
      loadUsers: vi.fn(),
      updateUser: vi.fn().mockResolvedValue(createAdminUser({ id: "user-2" })),
    },
    ...overrides,
  };
}

function renderMutations(adapters: AppAdapters) {
  const queryClient = createQueryClient({ defaultOptions: { queries: { retry: false } } });
  const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");

  return {
    invalidateQueries,
    ...renderHookWithProviders(() => useUserMutations(), { adapters, queryClient }),
  };
}

describe("useUserMutations", () => {
  afterEach(() => useSessionStore.getState().clearSession());

  it("should refresh the user listing after creating an account", async () => {
    useSessionStore.getState().setSession({
      currentUser: createAuthenticatedUser({ id: "admin-1" }),
      tokens: createAuthTokens(),
    });
    const adapters = buildAdapters();
    const { invalidateQueries, result } = renderMutations(adapters);

    await act(async () => {
      await result.current.create({
        email: "nuevo@example.edu",
        firstName: "Nuevo",
        identificationNumber: "8-111-2222",
        lastName: "Ingreso",
        password: "contrasena-larga",
        unitId: "fisc",
      });
    });

    await waitFor(() => expect(adapters.users.createUser).toHaveBeenCalledTimes(1));
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.administrativeUsersScope("admin-1"),
    });
  });

  it("should refresh the listing and the exact detail after an update", async () => {
    useSessionStore.getState().setSession({
      currentUser: createAuthenticatedUser({ id: "admin-1" }),
      tokens: createAuthTokens(),
    });
    const adapters = buildAdapters();
    const { invalidateQueries, result } = renderMutations(adapters);

    await act(async () => {
      await result.current.update("user-2", { globalRole: "ADMIN" });
    });

    await waitFor(() =>
      expect(adapters.users.updateUser).toHaveBeenCalledWith("user-2", {
        globalRole: "ADMIN",
      }),
    );
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.administrativeUsersScope("admin-1"),
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.administrativeUserDetail("admin-1", "user-2"),
    });
  });
});
