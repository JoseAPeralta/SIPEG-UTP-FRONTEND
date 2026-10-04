import { act, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createAppAdapters } from "@/app/adapters";
import { createQueryClient, queryKeys } from "@/app/query";
import { useOrganizationalUnitDetail } from "@/features/organizational-units";
import { useSessionStore } from "@/store/session";
import {
  createAuthenticatedUser,
  createAuthTokens,
  createCareer,
  createOrganizationalUnit,
} from "@/test/factories";
import { renderHookWithProviders } from "@/test/render";

import { useCareerMutations } from "./useCareerMutations";
import { useCareers } from "./useCareers";

function signIn(userId = "admin-1") {
  useSessionStore.getState().setSession({
    currentUser: createAuthenticatedUser({ globalRole: "ADMIN", id: userId }),
    tokens: createAuthTokens(),
  });
}

function renderMutations(commands: Partial<ReturnType<typeof createAppAdapters>["careers"]>) {
  const adapters = createAppAdapters({ source: "mock" });
  adapters.careers = { ...adapters.careers, ...commands };
  const queryClient = createQueryClient({ defaultOptions: { queries: { retry: false } } });
  const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");

  return {
    invalidateQueries,
    ...renderHookWithProviders(() => useCareerMutations(), { adapters, queryClient }),
  };
}

afterEach(() => {
  useSessionStore.setState({ currentUser: null, tokens: null });
});

describe("useCareerMutations", () => {
  it("should refresh career lists and unit details after creating a career", async () => {
    signIn();
    const create = vi.fn().mockResolvedValue(createCareer());
    const { invalidateQueries, result } = renderMutations({ createCareer: create });

    await act(async () => {
      await result.current.create({
        code: "DATA",
        description: null,
        name: "Ciencia de Datos",
        unitId: "fisc",
      });
    });

    await waitFor(() => expect(create).toHaveBeenCalledTimes(1));
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: queryKeys.publicCareers });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.administrativeCareers("admin-1"),
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.publicOrganizationalUnitDetails,
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.administrativeOrganizationalUnitDetails("admin-1"),
    });
  });

  it("should refresh both boundaries after updating and deleting a career", async () => {
    signIn();
    const update = vi.fn().mockResolvedValue(createCareer());
    const remove = vi.fn().mockResolvedValue(undefined);
    const { invalidateQueries, result } = renderMutations({
      deleteCareer: remove,
      updateCareer: update,
    });

    await act(async () => {
      await result.current.update("software", { name: "Ingenieria de Software" });
    });
    await act(async () => {
      await result.current.delete("software");
    });

    await waitFor(() => expect(update).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(remove).toHaveBeenCalledTimes(1));
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: queryKeys.publicCareers });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.publicOrganizationalUnitDetails,
    });
  });

  it("should refresh the public career list and the unit detail without unmounting", async () => {
    signIn();
    const baseCareer = createCareer({ id: "software", unitId: "fisc" });
    const baseUnit = createOrganizationalUnit({ id: "fisc" });
    let name = baseCareer.name;
    const loadCareers = vi.fn(() => Promise.resolve([{ ...baseCareer, name }]));
    const getOrganizationalUnit = vi.fn(() =>
      Promise.resolve({
        ...baseUnit,
        careers: [{ code: baseCareer.code, id: baseCareer.id, name }],
        defaultProgram: null,
      }),
    );
    const updateCareer = vi.fn((_careerId: string, request: { name?: string }) => {
      name = request.name ?? name;
      return Promise.resolve({ ...baseCareer, name });
    });

    const adapters = createAppAdapters({ source: "mock" });
    adapters.careers = { ...adapters.careers, loadCareers, updateCareer };
    adapters.organizationalUnits = {
      ...adapters.organizationalUnits,
      getOrganizationalUnit,
    };
    const queryClient = createQueryClient({ defaultOptions: { queries: { retry: false } } });

    const { result } = renderHookWithProviders(
      () => ({
        careers: useCareers("public"),
        detail: useOrganizationalUnitDetail("fisc", "administrative"),
        mutations: useCareerMutations(),
      }),
      { adapters, queryClient },
    );

    await waitFor(() =>
      expect(result.current.careers.careers?.[0]?.name).toBe("Desarrollo de Software"),
    );
    await waitFor(() =>
      expect(result.current.detail.organizationalUnit?.careers[0]?.name).toBe(
        "Desarrollo de Software",
      ),
    );

    await act(async () => {
      await result.current.mutations.update("software", { name: "Ingenieria de Software" });
    });

    await waitFor(() =>
      expect(result.current.careers.careers?.[0]?.name).toBe("Ingenieria de Software"),
    );
    await waitFor(() =>
      expect(result.current.detail.organizationalUnit?.careers[0]?.name).toBe(
        "Ingenieria de Software",
      ),
    );
  });
});
