import { act } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { createActivity, createCatalog } from "@/test/factories";
import { renderHookWithProviders } from "@/test/render";

import { useCatalogFilters } from "./useCatalogFilters";

const catalog = createCatalog({
  activities: [
    createActivity({ date: "2026-06-10", id: "activity-old", name: "Actividad antigua" }),
    createActivity({ date: "2026-06-20", id: "activity-new", name: "Actividad reciente" }),
  ],
});

describe("useCatalogFilters", () => {
  it("should build filtered and paginated rows with the initial sort", () => {
    const { result } = renderHookWithProviders(() =>
      useCatalogFilters(catalog, { initialSortDirection: "desc", perPage: 1 }),
    );

    expect(result.current.sortDirection).toBe("desc");
    expect(result.current.pagination.currentPage).toBe(1);
    expect(result.current.pagination.pageCount).toBe(2);
    expect(result.current.pagination.rows[0]?.activity.id).toBe("activity-new");
    expect(result.current.filteredCount).toBe(2);
    expect(result.current.pageSize).toBe(1);
  });

  it("should reset the page whenever a filter changes", () => {
    const { result } = renderHookWithProviders(() =>
      useCatalogFilters(catalog, { initialSortDirection: "desc", perPage: 1 }),
    );

    act(() => result.current.onPageChange(2));
    expect(result.current.pagination.currentPage).toBe(2);

    act(() => result.current.onSearchTermChange("reciente"));

    expect(result.current.pagination.currentPage).toBe(1);
    expect(result.current.filteredCount).toBe(1);
  });

  it("should clear every filter at once", () => {
    const { result } = renderHookWithProviders(() =>
      useCatalogFilters(catalog, { initialSortDirection: "desc", perPage: 1 }),
    );

    act(() => result.current.onSearchTermChange("antigua"));
    act(() => result.current.onTypeFilterChange("TALK"));
    act(() => result.current.onProgramFilterChange("program-1"));
    act(() => result.current.onClearFilters());

    expect(result.current.searchTerm).toBe("");
    expect(result.current.unitFilter).toBe("all");
    expect(result.current.typeFilter).toBe("all");
    expect(result.current.programFilter).toBe("all");
    expect(result.current.sortDirection).toBe("desc");
    expect(result.current.pagination.currentPage).toBe(1);
  });

  it("should start from the preferred unit and notify every unit change", () => {
    const onUnitFilterChange = vi.fn();
    const { result } = renderHookWithProviders(() =>
      useCatalogFilters(catalog, {
        initialSortDirection: "desc",
        initialUnitFilter: "fisc",
        onUnitFilterChange,
        perPage: 1,
      }),
    );

    expect(result.current.unitFilter).toBe("fisc");

    act(() => result.current.onUnitFilterChange("fic"));

    expect(result.current.unitFilter).toBe("fic");
    expect(onUnitFilterChange).toHaveBeenCalledWith("fic");

    act(() => result.current.onClearFilters());

    expect(result.current.unitFilter).toBe("all");
    expect(onUnitFilterChange).toHaveBeenLastCalledWith("all");
  });
});
