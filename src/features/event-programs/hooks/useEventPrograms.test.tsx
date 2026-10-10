import { act, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createAppAdapters } from "@/app/adapters";
import { createQueryClient, isPersistedQueryKey, queryKeys } from "@/app/query";
import { useSessionStore } from "@/store/session";
import { createAuthenticatedUser, createAuthTokens, createEventProgram } from "@/test/factories";
import { renderHookWithProviders } from "@/test/render";
import { useEventPrograms } from "./useEventPrograms";

function adaptersForPrograms() {
  return {
    ...createAppAdapters({ source: "mock" }),
    eventPrograms: { loadEventPrograms: vi.fn().mockResolvedValue([createEventProgram()]) },
    activityCatalog: { loadCatalog: vi.fn().mockRejectedValue(new Error("catalog unavailable")) },
    classrooms: { loadClassrooms: vi.fn().mockRejectedValue(new Error("classrooms unavailable")) },
    organizationalUnits: {
      loadOrganizationalUnits: vi.fn().mockRejectedValue(new Error("units unavailable")),
    },
  };
}

describe("useEventPrograms", () => {
  beforeEach(() =>
    useSessionStore.getState().setSession({
      currentUser: createAuthenticatedUser({ id: "user-1" }),
      tokens: createAuthTokens({ accessToken: "private-token" }),
    }),
  );
  afterEach(() => useSessionStore.getState().clearSession());

  it("loads programs independently and deduplicates consumers", async () => {
    const adapters = adaptersForPrograms();
    const { result } = renderHookWithProviders(
      () => ({ first: useEventPrograms(), second: useEventPrograms() }),
      { adapters },
    );
    await waitFor(() => expect(result.current.first.eventPrograms).toEqual([createEventProgram()]));
    expect(result.current.second.eventPrograms).toEqual(result.current.first.eventPrograms);
    expect(adapters.eventPrograms.loadEventPrograms).toHaveBeenCalledExactlyOnceWith(
      "administrative",
    );
    expect(adapters.activityCatalog.loadCatalog).not.toHaveBeenCalled();
    expect(adapters.classrooms.loadClassrooms).not.toHaveBeenCalled();
    expect(adapters.organizationalUnits.loadOrganizationalUnits).not.toHaveBeenCalled();
  });

  it("exposes loading before the independent port resolves", async () => {
    const adapters = adaptersForPrograms();
    let resolve!: (programs: ReturnType<typeof createEventProgram>[]) => void;
    adapters.eventPrograms.loadEventPrograms.mockReturnValue(
      new Promise((done) => {
        resolve = done;
      }),
    );
    const { result } = renderHookWithProviders(() => useEventPrograms(), { adapters });
    expect(result.current.isLoading).toBe(true);
    expect(result.current.eventPrograms).toBeNull();
    act(() => resolve([createEventProgram()]));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
  });

  it("distinguishes an empty successful list from missing data", async () => {
    const adapters = adaptersForPrograms();
    adapters.eventPrograms.loadEventPrograms.mockResolvedValue([]);
    const { result } = renderHookWithProviders(() => useEventPrograms(), { adapters });
    await waitFor(() => expect(result.current.eventPrograms).toEqual([]));
    expect(result.current.error).toBeNull();
  });

  it("exposes an error and permits retry without reading other domains", async () => {
    const adapters = adaptersForPrograms();
    const error = new Error("service unavailable");
    adapters.eventPrograms.loadEventPrograms.mockRejectedValueOnce(error);
    const { result } = renderHookWithProviders(() => useEventPrograms(), { adapters });
    await waitFor(() => expect(result.current.error).toBe(error));
    expect(result.current.eventPrograms).toBeNull();
    expect(result.current.isLoading).toBe(false);
    await act(async () => {
      await result.current.refetch();
    });
    await waitFor(() => expect(result.current.eventPrograms).toEqual([createEventProgram()]));
    expect(result.current.error).toBeNull();
    expect(adapters.eventPrograms.loadEventPrograms).toHaveBeenCalledTimes(2);
    expect(adapters.activityCatalog.loadCatalog).not.toHaveBeenCalled();
  });

  it("neither loads nor manually refetches without an identity", async () => {
    useSessionStore.getState().clearSession();
    const adapters = adaptersForPrograms();
    const { result } = renderHookWithProviders(() => useEventPrograms(), { adapters });
    expect(result.current.isLoading).toBe(false);
    await act(async () => {
      await result.current.refetch();
    });
    expect(adapters.eventPrograms.loadEventPrograms).not.toHaveBeenCalled();
    expect(result.current.eventPrograms).toBeNull();
  });

  it("scopes private data by identity without persisting programs or tokens", async () => {
    const adapters = adaptersForPrograms();
    const queryClient = createQueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result } = renderHookWithProviders(() => useEventPrograms(), { adapters, queryClient });
    await waitFor(() => expect(result.current.eventPrograms).toEqual([createEventProgram()]));
    const key = queryKeys.administrativeEventPrograms("user-1");
    expect(queryClient.getQueryData(key)).toEqual([createEventProgram()]);
    expect(isPersistedQueryKey(key)).toBe(false);
    expect(
      JSON.stringify(
        queryClient
          .getQueryCache()
          .getAll()
          .map((query) => query.queryKey),
      ),
    ).not.toContain("private-token");

    adapters.eventPrograms.loadEventPrograms.mockResolvedValue([
      createEventProgram({ id: "other-program" }),
    ]);
    act(() =>
      useSessionStore.getState().setSession({
        currentUser: createAuthenticatedUser({ id: "user-2" }),
        tokens: createAuthTokens(),
      }),
    );
    expect(result.current.eventPrograms).toBeNull();
    await waitFor(() => expect(result.current.eventPrograms?.[0]?.id).toBe("other-program"));
    expect(queryClient.getQueryData(key)).toEqual([createEventProgram()]);
    expect(queryClient.getQueryData(queryKeys.administrativeEventPrograms("user-2"))).toEqual([
      createEventProgram({ id: "other-program" }),
    ]);
  });
});
