import { waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createAppAdapters, type AppAdapters } from "@/app/adapters";
import { useSessionStore } from "@/store/session";
import { createAdminUser, createAuthenticatedUser, createAuthTokens } from "@/test/factories";
import { renderHookWithProviders } from "@/test/render";

import { useUserDetail } from "./useUserDetail";

function buildAdapters(overrides: Partial<AppAdapters> = {}): AppAdapters {
  return {
    ...createAppAdapters({ source: "mock" }),
    users: {
      getUser: vi.fn().mockResolvedValue(createAdminUser({ id: "user-2" })),
      loadUsers: vi.fn(),
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

describe("useUserDetail", () => {
  afterEach(() => useSessionStore.getState().clearSession());

  it("should not query without a session", () => {
    const adapters = buildAdapters();
    const { result } = renderHookWithProviders(() => useUserDetail("user-2"), { adapters });

    expect(result.current.user).toBeNull();
    expect(adapters.users.getUser).not.toHaveBeenCalled();
  });

  it("should not query without an id", () => {
    signIn();
    const adapters = buildAdapters();
    renderHookWithProviders(() => useUserDetail(""), { adapters });

    expect(adapters.users.getUser).not.toHaveBeenCalled();
  });

  it("should expose the requested user", async () => {
    signIn();
    const adapters = buildAdapters();
    const { result } = renderHookWithProviders(() => useUserDetail("user-2"), { adapters });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.user).toEqual(createAdminUser({ id: "user-2" }));
    expect(adapters.users.getUser).toHaveBeenCalledWith("user-2");
  });

  it("should classify a missing user", async () => {
    signIn();
    const adapters = buildAdapters({
      users: {
        getUser: vi.fn().mockRejectedValue(Object.assign(new Error("no existe"), { status: 404 })),
        loadUsers: vi.fn(),
      },
    });
    const { result } = renderHookWithProviders(() => useUserDetail("missing"), { adapters });

    await waitFor(() => expect(result.current.failure).toBe("notFound"));
  });
});
