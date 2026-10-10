import { act, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createAppAdapters, type AppAdapters } from "@/app/adapters";
import { PUBLIC_CATALOG_STALE_TIME_MS } from "@/app/query";
import { createQueryClient, isPersistedQueryKey, queryKeys } from "@/app/query";
import { useSessionStore } from "@/store/session";
import { useUnitPreferenceStore } from "@/store/unitPreference";
import { createAuthenticatedUser, createAuthTokens, createPublicActivity } from "@/test/factories";
import { renderHookWithProviders } from "@/test/render";
import type { PublicActivity } from "@/types/domain";

import { getProgramBadgeLabel } from "../model/catalogLabels";

import { useActivityCatalog } from "./useActivityCatalog";
import { usePublicActivities } from "./usePublicActivities";

const catalog: PublicActivity[] = [
  ...Array.from({ length: 12 }, (_, index) =>
    createPublicActivity({
      date: `2026-10-${String(index + 1).padStart(2, "0")}`,
      id: `scheduled-${index + 1}`,
    }),
  ),
  createPublicActivity({ date: "2026-10-20", id: "ongoing-1", status: "ONGOING" }),
  createPublicActivity({ date: "2026-09-15", id: "completed-1", status: "COMPLETED" }),
  createPublicActivity({ date: "2026-09-16", id: "completed-2", status: "COMPLETED" }),
];

function buildAdapters(
  loadPublicActivities: () => Promise<{ activities: readonly PublicActivity[] }>,
): AppAdapters {
  return {
    ...createAppAdapters({ source: "mock" }),
    publicActivityCatalog: {
      getPublicActivity: () => Promise.resolve(null),
      loadPublicActivities,
    },
  };
}

function adaptersWith(activities: readonly PublicActivity[]): AppAdapters {
  return buildAdapters(() => Promise.resolve({ activities }));
}

describe("usePublicActivities", () => {
  beforeEach(() => {
    useUnitPreferenceStore.getState().setSelectedUnitId("all");
  });

  afterEach(() => {
    useUnitPreferenceStore.getState().setSelectedUnitId("all");
    useSessionStore.getState().clearSession();
  });

  it("should start with the agenda defaults", async () => {
    const { result } = renderHookWithProviders(() => usePublicActivities(), {
      adapters: adaptersWith(catalog),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.period).toBe("available");
    expect(result.current.sortDirection).toBe("asc");
    expect(result.current.searchTerm).toBe("");
    expect(result.current.programFilter).toBe("all");
    expect(result.current.unitFilter).toBe("all");
    expect(result.current.unitTypeFilter).toBe("all");
    expect(result.current.pagination.currentPage).toBe(1);
    expect(result.current.filteredCount).toBe(13);
  });

  it("should order the available agenda from the oldest to the newest by default", async () => {
    const { result } = renderHookWithProviders(() => usePublicActivities(), {
      adapters: adaptersWith(catalog),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const [first, second] = result.current.pagination.rows;

    expect(result.current.pageSize).toBe(10);
    expect(first).toBeDefined();
    expect(second).toBeDefined();
    expect(first!.activity.date <= second!.activity.date).toBe(true);
  });

  it("should reset the page whenever a filter, search, sort or period changes", async () => {
    const { result } = renderHookWithProviders(() => usePublicActivities(), {
      adapters: adaptersWith(catalog),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const changes: (() => void)[] = [
      () => result.current.onSearchTermChange("Actividad"),
      () => result.current.onProgramFilterChange("program-1"),
      () => result.current.onUnitFilterChange("FIC"),
      () => result.current.onUnitTypeFilterChange("FACULTY"),
      () => result.current.onTypeFilterChange("TALK"),
      () => result.current.onSortDirectionChange("desc"),
    ];

    for (const change of changes) {
      act(() => result.current.onPageChange(2));
      expect(result.current.pagination.currentPage).toBe(2);

      act(change);

      await waitFor(() => expect(result.current.pagination.currentPage).toBe(1));
    }
  });

  it("should order past activities descending and restore ascending when leaving past", async () => {
    const { result } = renderHookWithProviders(() => usePublicActivities(), {
      adapters: adaptersWith(catalog),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.onPeriodChange("past"));
    await waitFor(() => expect(result.current.period).toBe("past"));
    expect(result.current.sortDirection).toBe("desc");
    expect(result.current.pagination.rows.every((row) => row.activity.status === "COMPLETED")).toBe(
      true,
    );

    act(() => result.current.onPeriodChange("available"));
    await waitFor(() => expect(result.current.period).toBe("available"));
    expect(result.current.sortDirection).toBe("asc");

    act(() => result.current.onPeriodChange("upcoming"));
    await waitFor(() => expect(result.current.period).toBe("upcoming"));
    expect(result.current.sortDirection).toBe("asc");
  });

  it("should prioritize the preferred unit without excluding the rest", async () => {
    useUnitPreferenceStore.getState().setSelectedUnitId("fisc");
    const mixed = [
      ...catalog.slice(0, 12),
      createPublicActivity({
        date: "2026-10-01",
        id: "fisc-1",
        unit: {
          backendId: "fisc",
          name: "Facultad de Ingenieria de Sistemas Computacionales",
          type: "FACULTY",
        },
      }),
      createPublicActivity({
        date: "2026-10-02",
        id: "fisc-2",
        unit: {
          backendId: "fisc",
          name: "Facultad de Ingenieria de Sistemas Computacionales",
          type: "FACULTY",
        },
      }),
    ];
    const { result } = renderHookWithProviders(() => usePublicActivities(), {
      adapters: adaptersWith(mixed),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.preferredUnit).toBe("fisc");
    expect(result.current.filteredCount).toBe(14);
    expect(result.current.pagination.rows[0]?.unitCode).toBe("FISC");
    expect(result.current.pagination.rows[1]?.unitCode).toBe("FISC");
    expect(result.current.pagination.rows.some((row) => row.unitCode === "FIC")).toBe(true);
  });

  it("should clear every filter without touching the unit preference store", async () => {
    useUnitPreferenceStore.getState().setSelectedUnitId("fisc");
    const { result } = renderHookWithProviders(() => usePublicActivities(), {
      adapters: adaptersWith(catalog),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.onPageChange(2));
    act(() => result.current.onSearchTermChange("zzz"));
    act(() => result.current.onProgramFilterChange("program-9"));
    act(() => result.current.onUnitTypeFilterChange("SUBDIRECTORATE"));
    act(() => result.current.onPeriodChange("past"));
    act(() => result.current.onSortDirectionChange("desc"));

    await waitFor(() => expect(result.current.searchTerm).toBe("zzz"));

    act(() => result.current.onClearFilters());

    await waitFor(() => expect(result.current.searchTerm).toBe(""));
    expect(result.current.period).toBe("available");
    expect(result.current.programFilter).toBe("all");
    expect(result.current.unitFilter).toBe("all");
    expect(result.current.unitTypeFilter).toBe("all");
    expect(result.current.sortDirection).toBe("asc");
    expect(result.current.pagination.currentPage).toBe(1);
    expect(result.current.preferredUnit).toBe("fisc");
    expect(useUnitPreferenceStore.getState().selectedUnitId).toBe("fisc");
  });

  it("should expose every program option from the full catalog even while filtering", async () => {
    const withPrograms = [
      createPublicActivity({
        id: "a1",
        program: { id: "p-b", isDefault: false, label: "Zeta", name: "Programa Zeta" },
      }),
      createPublicActivity({
        id: "a2",
        program: { id: "p-a", isDefault: false, label: "Alfa", name: "Programa Alfa" },
      }),
      ...Array.from({ length: 11 }, (_, index) =>
        createPublicActivity({ id: `rest-${index + 1}` }),
      ),
    ];
    const { result } = renderHookWithProviders(() => usePublicActivities(), {
      adapters: adaptersWith(withPrograms),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.onSearchTermChange("sin coincidencias"));

    await waitFor(() => expect(result.current.filteredCount).toBe(0));
    expect(result.current.programOptions).toEqual([
      { id: "p-a", label: "Alfa" },
      { id: "program-1", label: "Semana de innovacion" },
      { id: "p-b", label: "Zeta" },
    ]);
  });

  it("should expose an empty agenda without failing", async () => {
    const { result } = renderHookWithProviders(() => usePublicActivities(), {
      adapters: adaptersWith([]),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBeNull();
    expect(result.current.filteredCount).toBe(0);
    expect(result.current.rows).toEqual([]);
    expect(result.current.pagination.rows).toEqual([]);
    expect(result.current.summary).toEqual({ activityCount: 0 });
  });

  it("should expose the failure and retry with a single new request", async () => {
    const loadPublicActivities = vi
      .fn<() => Promise<{ activities: readonly PublicActivity[] }>>()
      .mockRejectedValueOnce(new Error("sin conexion"))
      .mockResolvedValue({ activities: catalog });
    const { result } = renderHookWithProviders(() => usePublicActivities(), {
      adapters: buildAdapters(loadPublicActivities),
    });

    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(result.current.error?.message).toBe("sin conexion");

    act(() => result.current.onSearchTermChange("Actividad"));
    expect(loadPublicActivities).toHaveBeenCalledTimes(1);

    await act(async () => {
      await result.current.refetch();
    });

    await waitFor(() => expect(result.current.error).toBeNull());
    expect(result.current.rows).toHaveLength(catalog.length);
    expect(loadPublicActivities).toHaveBeenCalledTimes(2);
  });

  it("should read the adapter once and never refetch when the filters change", async () => {
    const loadPublicActivities = vi.fn(() => Promise.resolve({ activities: catalog }));
    const { result } = renderHookWithProviders(() => usePublicActivities(), {
      adapters: buildAdapters(loadPublicActivities),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(loadPublicActivities).toHaveBeenCalledTimes(1);

    act(() => result.current.onSearchTermChange("Actividad"));
    act(() => result.current.onProgramFilterChange("program-1"));
    act(() => result.current.onUnitFilterChange("FIC"));
    act(() => result.current.onUnitTypeFilterChange("FACULTY"));
    act(() => result.current.onTypeFilterChange("TALK"));
    act(() => result.current.onSortDirectionChange("desc"));
    act(() => result.current.onPeriodChange("all"));

    await waitFor(() => expect(result.current.period).toBe("all"));
    expect(loadPublicActivities).toHaveBeenCalledTimes(1);
  });

  it("should label a default program with its unit name instead of the long name", () => {
    expect(
      getProgramBadgeLabel(
        {
          isDefault: true,
          label: null,
          name: "Programa de Eventos - Facultad de Ingenieria Civil",
        },
        { name: "Facultad de Ingenieria Civil" },
      ),
    ).toBe("Facultad de Ingenieria Civil");
  });

  it("should prefer a custom program label over the unit name", () => {
    expect(
      getProgramBadgeLabel(
        { isDefault: false, label: "CIT-2026", name: "Congreso de Innovacion" },
        { name: "Facultad de Ingenieria Civil" },
      ),
    ).toBe("CIT-2026");
  });
});

describe("usePublicActivities with the mock catalog", () => {
  beforeEach(() => {
    useUnitPreferenceStore.getState().setSelectedUnitId("all");
  });

  afterEach(() => {
    useUnitPreferenceStore.getState().setSelectedUnitId("all");
  });

  it("should filter by organizational unit code and reset the page", async () => {
    const { result } = renderHookWithProviders(() => usePublicActivities());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.onPageChange(2));
    act(() => result.current.onUnitFilterChange("FISC"));

    await waitFor(() => expect(result.current.pagination.currentPage).toBe(1));
    expect(result.current.pagination.rows.every((row) => row.unitCode === "FISC")).toBe(true);
  });

  it("should resolve every unit against the institutional registry", async () => {
    const { result } = renderHookWithProviders(() => usePublicActivities());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.rows.length).toBeGreaterThan(0);
    expect(result.current.rows.every((row) => row.unitCode !== null)).toBe(true);
  });
});

describe("usePublicActivities caching policy", () => {
  afterEach(() => useSessionStore.getState().clearSession());

  it("should not revalidate the agenda when the window regains focus", async () => {
    const queryClient = createQueryClient();
    const { result } = renderHookWithProviders(() => usePublicActivities(), { queryClient });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.catalog).not.toBeNull();

    // El valor por defecto del cliente revalida al recuperar el foco; la agenda
    // debe desviarse de esa politica para no descargarse en cada cambio de pestana.
    const options = (queryClient.getQueryCache().find({ queryKey: ["public-activity-catalog"] })
      ?.options ?? {}) as { refetchOnWindowFocus?: boolean; staleTime?: number };

    expect(options.refetchOnWindowFocus).toBe(false);
    expect(options.staleTime).toBe(PUBLIC_CATALOG_STALE_TIME_MS);
  });

  it("should keep the public and administrative catalogs in distinct keys", async () => {
    useSessionStore.getState().setSession({
      currentUser: createAuthenticatedUser({ id: "user-1" }),
      tokens: createAuthTokens({ accessToken: "access-token" }),
    });
    const queryClient = createQueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result } = renderHookWithProviders(
      () => ({ administrative: useActivityCatalog(), public: usePublicActivities() }),
      { queryClient },
    );

    await waitFor(() => expect(result.current.public.isLoading).toBe(false));
    await waitFor(() => expect(result.current.administrative.isLoading).toBe(false));

    const keys = queryClient
      .getQueryCache()
      .getAll()
      .map((query) => query.queryKey);
    expect(keys).toContainEqual(queryKeys.publicActivityCatalog);
    expect(keys).toContainEqual(queryKeys.administrativeActivityCatalog("user-1"));
    expect(isPersistedQueryKey(queryKeys.publicActivityCatalog)).toBe(true);
    expect(isPersistedQueryKey(queryKeys.administrativeActivityCatalog("user-1"))).toBe(false);
  });
});
