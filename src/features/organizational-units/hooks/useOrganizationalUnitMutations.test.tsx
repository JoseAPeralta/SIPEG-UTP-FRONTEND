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
import { useOrganizationalUnitMutations } from "./useOrganizationalUnitMutations";
import { useOrganizationalUnits } from "./useOrganizationalUnits";

function signIn(userId = "admin-1") {
  useSessionStore.getState().setSession({
    currentUser: createAuthenticatedUser({ globalRole: "ADMIN", id: userId }),
    tokens: createAuthTokens(),
  });
}

function renderMutations(
  commands: Partial<ReturnType<typeof createAppAdapters>["organizationalUnits"]>,
) {
  const adapters = createAppAdapters({ source: "mock" });
  adapters.organizationalUnits = { ...adapters.organizationalUnits, ...commands };
  const queryClient = createQueryClient({ defaultOptions: { queries: { retry: false } } });
  const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");

  return {
    invalidateQueries,
    ...renderHookWithProviders(() => useOrganizationalUnitMutations(), { adapters, queryClient }),
  };
}

afterEach(() => {
  useSessionStore.setState({ currentUser: null, tokens: null });
});

describe("useOrganizationalUnitMutations", () => {
  it("should refresh lists and the administrative activity catalog after creating a unit", async () => {
    signIn();
    const create = vi.fn().mockResolvedValue({
      ...createOrganizationalUnit(),
      careers: [],
      defaultProgram: null,
    });
    const { invalidateQueries, result } = renderMutations({ createOrganizationalUnit: create });

    await act(async () => {
      await result.current.create({
        code: "FISC",
        description: null,
        name: "Sistemas",
        type: "FACULTY",
      });
    });

    await waitFor(() => expect(create).toHaveBeenCalledTimes(1));
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.publicOrganizationalUnits,
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.administrativeOrganizationalUnits("admin-1"),
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.administrativeActivityCatalog("admin-1"),
    });
  });

  it("should refresh the exact detail and the public agenda only when the name changes", async () => {
    signIn();
    const update = vi.fn().mockResolvedValue({
      ...createOrganizationalUnit({ id: "fisc" }),
      careers: [],
      defaultProgram: null,
    });
    const { invalidateQueries, result } = renderMutations({
      updateOrganizationalUnit: update,
    });

    await act(async () => {
      await result.current.update("fisc", { name: "Facultad de Sistemas" });
    });

    await waitFor(() => expect(update).toHaveBeenCalledTimes(1));
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.publicOrganizationalUnitDetail("fisc"),
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.administrativeOrganizationalUnitDetail("admin-1", "fisc"),
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.publicActivityCatalog,
    });

    invalidateQueries.mockClear();

    await act(async () => {
      await result.current.update("fisc", { description: "Solo descripcion" });
    });

    await waitFor(() => expect(update).toHaveBeenCalledTimes(2));
    expect(invalidateQueries).not.toHaveBeenCalledWith({
      queryKey: queryKeys.publicActivityCatalog,
    });
  });

  it("should refresh lists, detail and both activity catalogs on a lifecycle change", async () => {
    signIn();
    const deactivate = vi.fn().mockResolvedValue({
      ...createOrganizationalUnit({ id: "fisc" }),
      careers: [],
      defaultProgram: null,
    });
    const { invalidateQueries, result } = renderMutations({
      deactivateOrganizationalUnit: deactivate,
    });

    await act(async () => {
      await result.current.deactivate("fisc");
    });

    await waitFor(() => expect(deactivate).toHaveBeenCalledTimes(1));
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.publicActivityCatalog,
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.administrativeActivityCatalog("admin-1"),
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.administrativeOrganizationalUnitDetail("admin-1", "fisc"),
    });
  });

  it("should refresh the public read model and the unit detail after a rename without unmounting", async () => {
    signIn();
    const base = createOrganizationalUnit({
      id: "fisc",
      name: "Facultad de Ingenieria de Sistemas",
    });
    let name = base.name;
    const loadOrganizationalUnits = vi.fn(() => Promise.resolve([{ ...base, name }]));
    const getOrganizationalUnit = vi.fn(() =>
      Promise.resolve({ ...base, name, careers: [], defaultProgram: null }),
    );
    const updateOrganizationalUnit = vi.fn((_unitId: string, request: { name?: string }) => {
      name = request.name ?? name;
      return Promise.resolve({ ...base, name, careers: [], defaultProgram: null });
    });

    const adapters = createAppAdapters({ source: "mock" });
    adapters.organizationalUnits = {
      ...adapters.organizationalUnits,
      getOrganizationalUnit,
      loadOrganizationalUnits,
      updateOrganizationalUnit,
    };
    const queryClient = createQueryClient({ defaultOptions: { queries: { retry: false } } });

    const { result } = renderHookWithProviders(
      () => ({
        detail: useOrganizationalUnitDetail("fisc", "administrative"),
        mutations: useOrganizationalUnitMutations(),
        units: useOrganizationalUnits("public"),
      }),
      { adapters, queryClient },
    );

    await waitFor(() =>
      expect(result.current.units.organizationalUnits?.[0]?.name).toBe(
        "Facultad de Ingenieria de Sistemas",
      ),
    );
    await waitFor(() =>
      expect(result.current.detail.organizationalUnit?.name).toBe(
        "Facultad de Ingenieria de Sistemas",
      ),
    );

    await act(async () => {
      await result.current.mutations.update("fisc", {
        name: "Facultad de Ingenieria de Sistemas Computacionales",
      });
    });

    await waitFor(() =>
      expect(result.current.units.organizationalUnits?.[0]?.name).toBe(
        "Facultad de Ingenieria de Sistemas Computacionales",
      ),
    );
    await waitFor(() =>
      expect(result.current.detail.organizationalUnit?.name).toBe(
        "Facultad de Ingenieria de Sistemas Computacionales",
      ),
    );
  });

  it("maps a conflict and clears it on reset", async () => {
    signIn();
    const adapters = createAppAdapters({ source: "mock" });
    adapters.organizationalUnits = {
      ...adapters.organizationalUnits,
      deactivateOrganizationalUnit: vi
        .fn()
        .mockRejectedValue(Object.assign(new Error("conflict"), { status: 409 })),
    };
    const { result } = renderHookWithProviders(() => useOrganizationalUnitMutations(), {
      adapters,
    });

    await act(async () => {
      await expect(result.current.deactivate("fisc")).rejects.toBeDefined();
    });

    await waitFor(() => expect(result.current.failure).toBe("conflict"));

    act(() => result.current.reset());
    await waitFor(() => expect(result.current.failure).toBeNull());
  });
});
