import { act, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { createAppAdapters, type AppAdapters } from "@/app/adapters";
import { createCatalog, createOperationsReadModel } from "@/test/factories";
import { renderHookWithProviders } from "@/test/render";

import { useActivityCatalog } from "./useActivityCatalog";

function buildAdapters(overrides: Partial<AppAdapters> = {}): AppAdapters {
  return {
    ...createAppAdapters({ source: "mock" }),
    activityCatalog: { loadCatalog: vi.fn().mockResolvedValue(createCatalog()) },
    operations: { loadOperations: vi.fn().mockResolvedValue(createOperationsReadModel()) },
    ...overrides,
  };
}

describe("useActivityCatalog", () => {
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

  it("should refetch the catalog on demand", async () => {
    const adapters = buildAdapters();
    const { result } = renderHookWithProviders(() => useActivityCatalog("administrative"), {
      adapters,
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.refetch();
    });

    expect(adapters.activityCatalog.loadCatalog).toHaveBeenCalledTimes(2);
  });
});
