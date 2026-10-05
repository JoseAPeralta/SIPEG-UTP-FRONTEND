import { act, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createAppAdapters, type AppAdapters } from "@/app/adapters";
import { createQueryClient, queryKeys } from "@/app/query";
import { useSessionStore } from "@/store/session";
import {
  createAuthenticatedUser,
  createAuthTokens,
  createCatalog,
  createOperationsReadModel,
} from "@/test/factories";
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
  beforeEach(() => {
    useSessionStore.getState().setSession({
      currentUser: createAuthenticatedUser({ id: "user-1" }),
      tokens: createAuthTokens({ accessToken: "secret-token" }),
    });
  });

  afterEach(() => {
    useSessionStore.getState().clearSession();
  });

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

  it("should scope the operations key by user id without the token", async () => {
    const adapters = buildAdapters();
    const queryClient = createQueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result } = renderHookWithProviders(() => useOperations(), { adapters, queryClient });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const keys = queryClient
      .getQueryCache()
      .getAll()
      .map((query) => query.queryKey);
    expect(keys).toContainEqual(queryKeys.operations("user-1"));
    expect(JSON.stringify(keys)).not.toContain("secret-token");
  });

  it("should not load or refetch operations anonymously", async () => {
    useSessionStore.getState().clearSession();
    const adapters = buildAdapters();
    const { result } = renderHookWithProviders(() => useOperations(), { adapters });

    expect(result.current.isLoading).toBe(false);
    await act(async () => {
      await result.current.refetch();
    });
    expect(adapters.operations.loadOperations).not.toHaveBeenCalled();
  });
});
