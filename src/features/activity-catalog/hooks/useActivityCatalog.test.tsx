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
    const { result } = renderHookWithProviders(() => useActivityCatalog(), {
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
        first: useActivityCatalog(),
        second: useActivityCatalog(),
      }),
      { adapters },
    );

    await waitFor(() => expect(result.current.first.isLoading).toBe(false));
    await waitFor(() => expect(result.current.second.isLoading).toBe(false));

    expect(adapters.activityCatalog.loadCatalog).toHaveBeenCalledTimes(1);
    expect(adapters.activityCatalog.loadCatalog).toHaveBeenCalledWith();
    expect(adapters.organizationalUnits.loadOrganizationalUnits).toHaveBeenCalledTimes(1);
    expect(adapters.classrooms.loadClassrooms).toHaveBeenCalledTimes(1);
    expect(result.current.second.catalog).not.toBeNull();
  });

  it("should expose the catalog error without data", async () => {
    const adapters = buildAdapters({
      activityCatalog: { loadCatalog: vi.fn().mockRejectedValue(new Error("catalogo caido")) },
    });
    const { result } = renderHookWithProviders(() => useActivityCatalog(), {
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
    const { result } = renderHookWithProviders(() => useActivityCatalog(), {
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
    const { result } = renderHookWithProviders(() => useActivityCatalog(), {
      adapters,
    });

    await waitFor(() => expect(result.current.error).not.toBeNull());

    expect(result.current.error?.message).toMatch(/aula-inexistente/);
    expect(result.current.catalog).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it("should refetch every composed resource on demand", async () => {
    const adapters = buildAdapters();
    const { result } = renderHookWithProviders(() => useActivityCatalog(), {
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

  it("should scope every administrative key by user id without the token", async () => {
    const adapters = buildAdapters();
    const queryClient = createQueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result } = renderHookWithProviders(() => useActivityCatalog(), {
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
    expect(keys).not.toContainEqual(queryKeys.publicActivityCatalog);
    expect(keys).not.toContainEqual(queryKeys.publicOrganizationalUnits);
    expect(keys).not.toContainEqual(queryKeys.publicClassrooms);
    expect(JSON.stringify(keys)).not.toContain("secret-token");
  });

  it("should keep a separate cache entry per identity", async () => {
    const adapters = buildAdapters();
    const queryClient = createQueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result } = renderHookWithProviders(() => useActivityCatalog(), {
      adapters,
      queryClient,
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      useSessionStore.getState().setSession({
        currentUser: createAuthenticatedUser({ id: "user-2" }),
        tokens: createAuthTokens({ accessToken: "other-token" }),
      });
    });

    await waitFor(() => expect(adapters.activityCatalog.loadCatalog).toHaveBeenCalledTimes(2));

    const keys = queryClient
      .getQueryCache()
      .getAll()
      .map((query) => query.queryKey);
    expect(keys).toContainEqual(queryKeys.administrativeActivityCatalog("user-1"));
    expect(keys).toContainEqual(queryKeys.administrativeActivityCatalog("user-2"));
    expect(queryKeys.administrativeActivityCatalog("user-1")).not.toEqual(
      queryKeys.administrativeActivityCatalog("user-2"),
    );
  });

  it("should not load or refetch the administrative catalog anonymously", async () => {
    useSessionStore.getState().clearSession();
    const adapters = buildAdapters();
    const { result } = renderHookWithProviders(() => useActivityCatalog(), {
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

  it("should compose the complete working context for an administrator", async () => {
    const adapters = buildAdapters();
    const queryClient = createQueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result } = renderHookWithProviders(() => useActivityCatalog({ mode: "all-programs" }), {
      adapters,
      queryClient,
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(adapters.activityCatalog.loadCatalog).toHaveBeenCalledWith("all-programs");
    expect(adapters.organizationalUnits.loadOrganizationalUnits).toHaveBeenCalledWith({
      isActive: "all",
    });
    expect(adapters.classrooms.loadClassrooms).toHaveBeenCalledWith({ isActive: "all" });
    expect(result.current.catalog).not.toBeNull();

    const keys = queryClient
      .getQueryCache()
      .getAll()
      .map((query) => query.queryKey);
    expect(keys).toContainEqual(queryKeys.administrativeWorkingContextCatalog("user-1"));
    expect(keys).toContainEqual(queryKeys.administrativeOrganizationalUnitsAll("user-1"));
    expect(keys).toContainEqual(queryKeys.administrativeClassrooms("user-1", { isActive: "all" }));
  });

  it("should not load the complete working context for a regular user", async () => {
    useSessionStore.getState().setSession({
      currentUser: createAuthenticatedUser({ globalRole: "USER", id: "user-1" }),
      tokens: createAuthTokens({ accessToken: "secret-token" }),
    });
    const adapters = buildAdapters();
    const { result } = renderHookWithProviders(() => useActivityCatalog({ mode: "all-programs" }), {
      adapters,
    });

    expect(result.current.catalog).toBeNull();
    await waitFor(() => expect(result.current.isFetching).toBe(false));

    expect(adapters.activityCatalog.loadCatalog).not.toHaveBeenCalled();
    expect(result.current.catalog).toBeNull();
  });

  it("should expose the combined fetching state", async () => {
    const adapters = buildAdapters();
    const { result } = renderHookWithProviders(() => useActivityCatalog(), { adapters });

    expect(result.current.isFetching).toBe(true);
    await waitFor(() => expect(result.current.isFetching).toBe(false));
  });

  it("should accept inactive references that exist in the complete mode", async () => {
    const adapters = buildAdapters({
      classrooms: {
        loadClassrooms: vi
          .fn()
          .mockResolvedValue([createClassroom({ id: "classroom-1", isActive: false })]),
      },
      organizationalUnits: {
        loadOrganizationalUnits: vi
          .fn()
          .mockResolvedValue([createOrganizationalUnit({ id: "fic", isActive: false })]),
      },
    });
    const { result } = renderHookWithProviders(() => useActivityCatalog({ mode: "all-programs" }), {
      adapters,
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBeNull();
    expect(result.current.catalog?.classrooms[0]?.isActive).toBe(false);
    expect(result.current.catalog?.organizationalUnits[0]?.isActive).toBe(false);
  });

  it("should still report a dangling reference in the complete mode", async () => {
    const adapters = buildAdapters({
      activityCatalog: {
        loadCatalog: vi.fn().mockResolvedValue(
          createActivityCatalogPayload({
            activities: [createActivity({ classroomId: "aula-inexistente" })],
          }),
        ),
      },
    });
    const { result } = renderHookWithProviders(() => useActivityCatalog({ mode: "all-programs" }), {
      adapters,
    });

    await waitFor(() => expect(result.current.error).not.toBeNull());

    expect(result.current.error?.message).toMatch(/aula-inexistente/);
    expect(result.current.catalog).toBeNull();
  });
});
