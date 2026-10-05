import { act, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createAppAdapters } from "@/app/adapters";
import { useSessionStore } from "@/store/session";
import { useWorkingContextStore } from "@/store/workingContext";
import { createAuthenticatedUser, createAuthTokens } from "@/test/factories";
import { renderHookWithProviders } from "@/test/render";

import { useActivityCatalogPage } from "./useActivityCatalogPage";

describe("useActivityCatalogPage", () => {
  beforeEach(() => {
    useWorkingContextStore.getState().clearWorkingContext();
    useSessionStore.getState().setSession({
      currentUser: createAuthenticatedUser(),
      tokens: createAuthTokens(),
    });
  });

  afterEach(() => {
    useSessionStore.getState().clearSession();
  });

  it("should load the catalog and summarize it", async () => {
    const { result } = renderHookWithProviders(() => useActivityCatalogPage());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.summary?.activityCount).toBeGreaterThan(0);
    expect(result.current.pagination.rows.length).toBeLessThanOrEqual(9);
    expect(result.current.pageSize).toBe(9);
    expect(result.current.programSummaries.length).toBeGreaterThan(0);
  });

  it("should reset the page whenever a filter changes", async () => {
    const { result } = renderHookWithProviders(() => useActivityCatalogPage());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.onPageChange(3));
    expect(result.current.pagination.currentPage).toBe(3);

    act(() => result.current.onSearchTermChange("ciberseguridad"));

    await waitFor(() => expect(result.current.pagination.currentPage).toBe(1));
    expect(result.current.filteredCount).toBeGreaterThan(0);
  });

  it("should clear every filter at once", async () => {
    const { result } = renderHookWithProviders(() => useActivityCatalogPage());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.onSearchTermChange("ciberseguridad"));
    act(() => result.current.onTypeFilterChange("TALK"));
    act(() => result.current.onClearFilters());

    await waitFor(() => expect(result.current.searchTerm).toBe(""));
    expect(result.current.typeFilter).toBe("all");
    expect(result.current.sortDirection).toBe("asc");
  });

  it("should store the selected working context", async () => {
    const { result } = renderHookWithProviders(() => useActivityCatalogPage());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() =>
      result.current.onSelectContext({ id: "program-innovation-week", kind: "eventProgram" }),
    );

    expect(useWorkingContextStore.getState().workingContext).toEqual({
      id: "program-innovation-week",
      kind: "eventProgram",
    });
  });

  it("should expose a retry action after a load failure", async () => {
    const failingAdapters = {
      ...createAppAdapters({ source: "mock" }),
      activityCatalog: { loadCatalog: () => Promise.reject(new Error("sin conexion")) },
      operations: { loadOperations: () => Promise.reject(new Error("sin conexion")) },
    };
    const { result } = renderHookWithProviders(() => useActivityCatalogPage(), {
      adapters: failingAdapters,
    });

    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(result.current.error?.message).toBe("sin conexion");
    expect(typeof result.current.refetch).toBe("function");
  });
});
