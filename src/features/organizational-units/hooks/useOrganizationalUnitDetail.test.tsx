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

import { useOrganizationalUnitDetail } from "./useOrganizationalUnitDetail";

describe("useOrganizationalUnitDetail", () => {
  afterEach(() => useSessionStore.getState().clearSession());

  it("should read a unit publicly", async () => {
    const detail = {
      ...createOrganizationalUnit({ id: "fisc" }),
      careers: [],
      defaultProgram: null,
    };
    const getOrganizationalUnit = vi.fn().mockResolvedValue(detail);
    const adapters = createAppAdapters({ source: "mock" });
    adapters.organizationalUnits = {
      loadOrganizationalUnits: adapters.organizationalUnits.loadOrganizationalUnits,
      getOrganizationalUnit,
    };
    const queryClient = createQueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result } = renderHookWithProviders(
      () => useOrganizationalUnitDetail("fisc", "public"),
      { adapters, queryClient },
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.organizationalUnit).toEqual(detail);
    expect(queryClient.getQueryData(queryKeys.publicOrganizationalUnitDetail("fisc"))).toBeTruthy();
  });

  it("should disable the administrative read anonymously and scope it by user", async () => {
    const getOrganizationalUnit = vi.fn().mockResolvedValue({
      ...createOrganizationalUnit(),
      careers: [],
      defaultProgram: null,
    });
    const adapters = createAppAdapters({ source: "mock" });
    adapters.organizationalUnits = {
      loadOrganizationalUnits: adapters.organizationalUnits.loadOrganizationalUnits,
      getOrganizationalUnit,
    };
    const queryClient = createQueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result, rerender } = renderHookWithProviders(
      () => useOrganizationalUnitDetail("fic", "administrative"),
      { adapters, queryClient },
    );

    expect(result.current.isLoading).toBe(false);
    await act(async () => result.current.refetch());
    expect(getOrganizationalUnit).not.toHaveBeenCalled();

    useSessionStore.getState().setSession({
      currentUser: createAuthenticatedUser({ id: "user-1" }),
      tokens: createAuthTokens(),
    });
    rerender();
    await waitFor(() => expect(getOrganizationalUnit).toHaveBeenCalledTimes(1));
    expect(
      queryClient.getQueryData(queryKeys.administrativeOrganizationalUnitDetail("user-1", "fic")),
    ).toBeTruthy();
  });
});
