import { waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createAppAdapters, type AppAdapters } from "@/app/adapters";
import { createQueryClient, queryKeys } from "@/app/query";
import { useSessionStore } from "@/store/session";
import { createAdminUser, createAuthenticatedUser, createAuthTokens } from "@/test/factories";
import { renderHookWithProviders } from "@/test/render";

import { useUsersPage } from "./useUsersPage";

const filters = { globalRole: "ADMIN" as const, q: "mariana" };
const result = {
  items: [createAdminUser({ id: "user-1" })],
  limit: 20,
  page: 2,
  total: 40,
  totalPages: 2,
};

function buildAdapters(overrides: Partial<AppAdapters> = {}): AppAdapters {
  return {
    ...createAppAdapters({ source: "mock" }),
    users: {
      loadUsers: vi.fn().mockResolvedValue([createAdminUser()]),
      loadUsersPage: vi.fn().mockResolvedValue(result),
    },
    ...overrides,
  };
}

function signIn() {
  useSessionStore.getState().setSession({
    currentUser: createAuthenticatedUser({ id: "admin-1" }),
    tokens: createAuthTokens(),
  });
}

describe("useUsersPage", () => {
  afterEach(() => useSessionStore.getState().clearSession());

  it("should not query without a session", () => {
    const adapters = buildAdapters();
    const { result: hook } = renderHookWithProviders(() => useUsersPage(filters, 2), { adapters });

    expect(hook.current.page).toBeNull();
    expect(adapters.users.loadUsersPage).not.toHaveBeenCalled();
  });

  it("should request one filtered page and keep it under the identity key", async () => {
    signIn();
    const queryClient = createQueryClient({ defaultOptions: { queries: { retry: false } } });
    const adapters = buildAdapters();
    const { result: hook } = renderHookWithProviders(() => useUsersPage(filters, 2), {
      adapters,
      queryClient,
    });

    await waitFor(() => expect(hook.current.isLoading).toBe(false));

    expect(adapters.users.loadUsersPage).toHaveBeenCalledWith(filters, 2);
    expect(hook.current.page).toEqual(result);
    expect(
      queryClient.getQueryData(queryKeys.administrativeUsersPage("admin-1", filters, 2)),
    ).toEqual(result);
  });

  it("should expose the listing failure", async () => {
    signIn();
    const adapters = buildAdapters({
      users: {
        loadUsers: vi.fn(),
        loadUsersPage: vi.fn().mockRejectedValue(new Error("usuarios caidos")),
      },
    });
    const { result: hook } = renderHookWithProviders(() => useUsersPage(filters, 1), { adapters });

    await waitFor(() => expect(hook.current.error).not.toBeNull());

    expect(hook.current.error?.message).toBe("usuarios caidos");
  });
});
