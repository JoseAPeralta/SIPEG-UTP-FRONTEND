import { act, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { createAppAdapters, type AppAdapters } from "@/app/adapters";
import { createCatalog, createOperationsReadModel } from "@/test/factories";
import { renderHookWithProviders } from "@/test/render";

import { useOperations } from "./useOperations";

function buildAdapters(overrides: Partial<AppAdapters> = {}): AppAdapters {
  return {
    ...createAppAdapters({ source: "mock" }),
    activityCatalog: { loadCatalog: vi.fn().mockResolvedValue(createCatalog()) },
    operations: { loadOperations: vi.fn().mockResolvedValue(createOperationsReadModel()) },
    ...overrides,
  };
}

describe("useOperations", () => {
  it("should load operations once for several consumers", async () => {
    const adapters = buildAdapters();
    const { result } = renderHookWithProviders(
      () => ({ first: useOperations(), second: useOperations() }),
      { adapters },
    );

    await waitFor(() => expect(result.current.first.isLoading).toBe(false));
    await waitFor(() => expect(result.current.second.isLoading).toBe(false));

    expect(adapters.operations.loadOperations).toHaveBeenCalledTimes(1);
    expect(result.current.second.operations).not.toBeNull();
  });

  it("should expose the operations error without data", async () => {
    const adapters = buildAdapters({
      operations: { loadOperations: vi.fn().mockRejectedValue(new Error("operaciones caidas")) },
    });
    const { result } = renderHookWithProviders(() => useOperations(), { adapters });

    await waitFor(() => expect(result.current.error).not.toBeNull());

    expect(result.current.error?.message).toBe("operaciones caidas");
    expect(result.current.operations).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it("should refetch operations on demand", async () => {
    const adapters = buildAdapters();
    const { result } = renderHookWithProviders(() => useOperations(), { adapters });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.refetch();
    });

    expect(adapters.operations.loadOperations).toHaveBeenCalledTimes(2);
  });
});
