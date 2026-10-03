import { act, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createAppAdapters } from "@/app/adapters";
import { createQueryClient, queryKeys } from "@/app/query";
import { useSessionStore } from "@/store/session";
import {
  createAuthenticatedUser,
  createAuthTokens,
  createOrganizationalUnit,
} from "@/test/factories";
import { renderHookWithProviders } from "@/test/render";

import { useOrganizationalUnits } from "./useOrganizationalUnits";

describe("useOrganizationalUnits", () => {
  afterEach(() => useSessionStore.getState().clearSession());

  it("should use a public cache anonymously", async () => {
    const adapters = createAppAdapters({ source: "mock" });
    const loadOrganizationalUnits = vi.fn().mockResolvedValue([createOrganizationalUnit()]);
    const queryClient = createQueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result } = renderHookWithProviders(() => useOrganizationalUnits("public"), {
      adapters: { ...adapters, organizationalUnits: { loadOrganizationalUnits } },
      queryClient,
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(loadOrganizationalUnits).toHaveBeenCalledTimes(1);
    expect(queryClient.getQueryData(queryKeys.publicOrganizationalUnits)).toBeTruthy();
  });

  it("should scope administrative data by user and disable it anonymously", async () => {
    const adapters = createAppAdapters({ source: "mock" });
    const loadOrganizationalUnits = vi.fn().mockResolvedValue([createOrganizationalUnit()]);
    const queryClient = createQueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result, rerender } = renderHookWithProviders(
      () => useOrganizationalUnits("administrative"),
      {
        adapters: { ...adapters, organizationalUnits: { loadOrganizationalUnits } },
        queryClient,
      },
    );

    expect(result.current.isLoading).toBe(false);
    await act(async () => result.current.refetch());
    expect(loadOrganizationalUnits).not.toHaveBeenCalled();

    useSessionStore.getState().setSession({
      currentUser: createAuthenticatedUser({ id: "user-1" }),
      tokens: createAuthTokens({ accessToken: "secret-token" }),
    });
    rerender();
    await waitFor(() => expect(loadOrganizationalUnits).toHaveBeenCalledTimes(1));

    const keys = queryClient
      .getQueryCache()
      .getAll()
      .map((query) => query.queryKey);
    expect(keys).toContainEqual(queryKeys.administrativeOrganizationalUnits("user-1"));
    expect(JSON.stringify(keys)).not.toContain("secret-token");
  });
});
