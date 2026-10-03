import { act, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createAppAdapters, type AppAdapters } from "@/app/adapters";
import { createQueryClient, queryKeys } from "@/app/query";
import { useSessionStore } from "@/store/session";
import {
  createActivity,
  createActivityCatalogPayload,
  createAuthenticatedUser,
  createAuthTokens,
  createClassroom,
  createEventProgram,
  createOrganizationalUnit,
  createOperationsReadModel,
} from "@/test/factories";
import { renderHookWithProviders } from "@/test/render";

import { useActivityCatalog } from "./useActivityCatalog";

function buildAdapters(overrides: Partial<AppAdapters> = {}): AppAdapters {
  return {
    ...createAppAdapters({ source: "mock" }),
    activityCatalog: { loadCatalog: vi.fn().mockResolvedValue(createActivityCatalogPayload()) },
    classrooms: { loadClassrooms: vi.fn().mockResolvedValue([createClassroom()]) },
    operations: { loadOperations: vi.fn().mockResolvedValue(createOperationsReadModel()) },
    organizationalUnits: {
      loadOrganizationalUnits: vi.fn().mockResolvedValue([createOrganizationalUnit()]),
    },
    ...overrides,
  };
}

describe("useActivityCatalog", () => {
  beforeEach(() => {
    useSessionStore.getState().setSession({
      currentUser: createAuthenticatedUser({ id: "user-1" }),
      tokens: createAuthTokens({ accessToken: "secret-token" }),
    });
  });

  afterEach(() => {
    useSessionStore.getState().clearSession();
  });

  it("should compose programs, activities, units and classrooms from their own adapters", async () => {
    const adapters = buildAdapters();
    const { result } = renderHookWithProviders(() => useActivityCatalog("administrative"), {
      adapters,
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.catalog).toEqual({
      activities: createActivityCatalogPayload().activities,
      classrooms: [createClassroom()],
      eventPrograms: createActivityCatalogPayload().eventPrograms,
      organizationalUnits: [createOrganizationalUnit()],
    });
    expect(adapters.organizationalUnits.loadOrganizationalUnits).toHaveBeenCalledTimes(1);
    expect(adapters.classrooms.loadClassrooms).toHaveBeenCalledTimes(1);
  });

  it("should load the catalog once for several consumers", async () => {
    const adapters = buildAdapters();
    const { result } = renderHookWithProviders(
      () => ({
        first: useActivityCatalog("administrative"),
        second: useActivityCatalog("administrative"),
      }),
      { adapters },
    );

    await waitFor(() => expect(result.current.first.isLoading).toBe(false));
    await waitFor(() => expect(result.current.second.isLoading).toBe(false));

    expect(adapters.activityCatalog.loadCatalog).toHaveBeenCalledTimes(1);
    expect(adapters.activityCatalog.loadCatalog).toHaveBeenCalledWith("administrative");
    expect(adapters.organizationalUnits.loadOrganizationalUnits).toHaveBeenCalledTimes(1);
    expect(adapters.classrooms.loadClassrooms).toHaveBeenCalledTimes(1);
    expect(result.current.second.catalog).not.toBeNull();
  });

  it("should keep public and administrative catalog caches separate", async () => {
    const adapters = buildAdapters();
    const { result } = renderHookWithProviders(
      () => ({
        administrative: useActivityCatalog("administrative"),
        public: useActivityCatalog("public"),
      }),
      { adapters },
    );

    await waitFor(() => expect(result.current.administrative.isLoading).toBe(false));
    await waitFor(() => expect(result.current.public.isLoading).toBe(false));

    expect(adapters.activityCatalog.loadCatalog).toHaveBeenCalledTimes(2);
    expect(adapters.activityCatalog.loadCatalog).toHaveBeenCalledWith("administrative");
    expect(adapters.activityCatalog.loadCatalog).toHaveBeenCalledWith("public");
  });

  it("should expose the catalog error without data", async () => {
    const adapters = buildAdapters({
      activityCatalog: { loadCatalog: vi.fn().mockRejectedValue(new Error("catalogo caido")) },
    });
    const { result } = renderHookWithProviders(() => useActivityCatalog("administrative"), {
      adapters,
    });

    await waitFor(() => expect(result.current.error).not.toBeNull());

    expect(result.current.error?.message).toBe("catalogo caido");
    expect(result.current.catalog).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it("should block the catalog when a catalog resource fails", async () => {
    const adapters = buildAdapters({
      classrooms: { loadClassrooms: vi.fn().mockRejectedValue(new Error("aulas caidas")) },
    });
    const { result } = renderHookWithProviders(() => useActivityCatalog("administrative"), {
      adapters,
    });

    await waitFor(() => expect(result.current.error).not.toBeNull());

    expect(result.current.error?.message).toBe("aulas caidas");
    expect(result.current.catalog).toBeNull();
  });

  it("should report a dangling classroom reference as an error instead of crashing", async () => {
    const adapters = buildAdapters({
      activityCatalog: {
        loadCatalog: vi.fn().mockResolvedValue(
          createActivityCatalogPayload({
            activities: [createActivity({ classroomId: "aula-inexistente" })],
            eventPrograms: [createEventProgram()],
          }),
        ),
      },
    });
    const { result } = renderHookWithProviders(() => useActivityCatalog("administrative"), {
      adapters,
    });

    await waitFor(() => expect(result.current.error).not.toBeNull());

    expect(result.current.error?.message).toMatch(/aula-inexistente/);
    expect(result.current.catalog).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it("should refetch every composed resource on demand", async () => {
    const adapters = buildAdapters();
    const { result } = renderHookWithProviders(() => useActivityCatalog("administrative"), {
      adapters,
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.refetch();
    });

    expect(adapters.activityCatalog.loadCatalog).toHaveBeenCalledTimes(2);
    expect(adapters.organizationalUnits.loadOrganizationalUnits).toHaveBeenCalledTimes(2);
    expect(adapters.classrooms.loadClassrooms).toHaveBeenCalledTimes(2);
  });

  it("should scope the administrative key by user id without the token", async () => {
    const adapters = buildAdapters();
    const queryClient = createQueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result } = renderHookWithProviders(() => useActivityCatalog("administrative"), {
      adapters,
      queryClient,
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const keys = queryClient
      .getQueryCache()
      .getAll()
      .map((query) => query.queryKey);
    expect(keys).toContainEqual(queryKeys.administrativeActivityCatalog("user-1"));
    expect(keys).toContainEqual(queryKeys.administrativeOrganizationalUnits("user-1"));
    expect(keys).toContainEqual(queryKeys.administrativeClassrooms("user-1"));
    expect(JSON.stringify(keys)).not.toContain("secret-token");
  });

  it("should not load or refetch the administrative catalog anonymously", async () => {
    useSessionStore.getState().clearSession();
    const adapters = buildAdapters();
    const { result } = renderHookWithProviders(() => useActivityCatalog("administrative"), {
      adapters,
    });

    expect(result.current.isLoading).toBe(false);
    await act(async () => {
      await result.current.refetch();
    });
    expect(adapters.activityCatalog.loadCatalog).not.toHaveBeenCalled();
    expect(adapters.organizationalUnits.loadOrganizationalUnits).not.toHaveBeenCalled();
    expect(adapters.classrooms.loadClassrooms).not.toHaveBeenCalled();
  });

  it("should load the public catalog anonymously", async () => {
    useSessionStore.getState().clearSession();
    const adapters = buildAdapters();
    const { result } = renderHookWithProviders(() => useActivityCatalog("public"), { adapters });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(adapters.activityCatalog.loadCatalog).toHaveBeenCalledWith("public");
    expect(result.current.catalog).not.toBeNull();
  });
});
