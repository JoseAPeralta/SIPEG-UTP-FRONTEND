import { act, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createAppAdapters } from "@/app/adapters";
import { createQueryClient, isPersistedQueryKey, queryKeys } from "@/app/query";
import { useSessionStore } from "@/store/session";
import {
  createAuthenticatedUser,
  createAuthTokens,
  createEventProgramListItem,
} from "@/test/factories";
import { renderHookWithProviders } from "@/test/render";
import type { EventProgramListFilters } from "../model/eventProgramList";
import { useEventProgramsPage } from "./useEventProgramsPage";

const filters: EventProgramListFilters = { status: "ALL" };

function page(items = [createEventProgramListItem()], overrides = {}) {
  return { items, limit: 20, page: 1, total: items.length, totalPages: 1, ...overrides };
}

function adaptersForPage() {
  return {
    ...createAppAdapters({ source: "mock" }),
    eventPrograms: {
      loadEventPrograms: vi.fn().mockResolvedValue([]),
      loadEventProgramsPage: vi.fn().mockResolvedValue(page()),
    },
    activityCatalog: { loadCatalog: vi.fn().mockRejectedValue(new Error("catalog unavailable")) },
    classrooms: { loadClassrooms: vi.fn().mockRejectedValue(new Error("classrooms unavailable")) },
    organizationalUnits: {
      loadOrganizationalUnits: vi.fn().mockRejectedValue(new Error("units unavailable")),
    },
  };
}

describe("useEventProgramsPage", () => {
  beforeEach(() =>
    useSessionStore.getState().setSession({
      currentUser: createAuthenticatedUser({ globalRole: "ADMIN", id: "user-1" }),
      tokens: createAuthTokens({ accessToken: "private-token" }),
    }),
  );
  afterEach(() => useSessionStore.getState().clearSession());

  it("loads one filtered page and deduplicates consumers without reading other domains", async () => {
    const adapters = adaptersForPage();
    const { result } = renderHookWithProviders(
      () => ({ first: useEventProgramsPage(filters, 1), second: useEventProgramsPage(filters, 1) }),
      { adapters },
    );

    await waitFor(() => expect(result.current.first.page).toEqual(page()));
    expect(result.current.second.page).toEqual(result.current.first.page);
    expect(adapters.eventPrograms.loadEventProgramsPage).toHaveBeenCalledExactlyOnceWith(
      filters,
      1,
    );
    expect(adapters.eventPrograms.loadEventPrograms).not.toHaveBeenCalled();
    expect(adapters.activityCatalog.loadCatalog).not.toHaveBeenCalled();
    expect(adapters.classrooms.loadClassrooms).not.toHaveBeenCalled();
    expect(adapters.organizationalUnits.loadOrganizationalUnits).not.toHaveBeenCalled();
  });

  it("exposes loading before the page resolves", async () => {
    const adapters = adaptersForPage();
    let resolve!: (value: ReturnType<typeof page>) => void;
    adapters.eventPrograms.loadEventProgramsPage.mockReturnValue(
      new Promise((done) => {
        resolve = done;
      }),
    );
    const { result } = renderHookWithProviders(() => useEventProgramsPage(filters, 1), {
      adapters,
    });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.page).toBeNull();
    act(() => resolve(page()));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
  });

  it("replaces the page when filters change instead of showing stale results", async () => {
    const adapters = adaptersForPage();
    const pending: (() => void)[] = [];
    adapters.eventPrograms.loadEventProgramsPage.mockImplementation(
      () =>
        new Promise((done) => {
          pending.push(() =>
            done(
              pending.length === 1
                ? page([createEventProgramListItem({ id: "program-1" })])
                : page([createEventProgramListItem({ id: "program-2" })]),
            ),
          );
        }),
    );
    let currentFilters: EventProgramListFilters = { status: "ALL" };
    const { result, rerender } = renderHookWithProviders(
      () => useEventProgramsPage(currentFilters, 1),
      { adapters },
    );
    await waitFor(() => expect(pending).toHaveLength(1));
    act(() => pending[0]!());
    await waitFor(() => expect(result.current.page?.items[0]?.id).toBe("program-1"));

    currentFilters = { status: "DRAFT" };
    rerender();
    await waitFor(() => expect(pending).toHaveLength(2));
    expect(result.current.page).toBeNull();
    act(() => pending[1]!());
    await waitFor(() => expect(result.current.page?.items[0]?.id).toBe("program-2"));
  });

  it("distinguishes an empty successful page from missing data", async () => {
    const adapters = adaptersForPage();
    adapters.eventPrograms.loadEventProgramsPage.mockResolvedValue(
      page([], { total: 0, totalPages: 0 }),
    );
    const { result } = renderHookWithProviders(() => useEventProgramsPage(filters, 1), {
      adapters,
    });

    await waitFor(() => expect(result.current.page).toEqual(page([], { total: 0, totalPages: 0 })));
    expect(result.current.error).toBeNull();
  });

  it("exposes an error and permits retry without reading other domains", async () => {
    const adapters = adaptersForPage();
    const error = new Error("service unavailable");
    adapters.eventPrograms.loadEventProgramsPage.mockRejectedValueOnce(error);
    const { result } = renderHookWithProviders(() => useEventProgramsPage(filters, 1), {
      adapters,
    });

    await waitFor(() => expect(result.current.error).toBe(error));
    expect(result.current.page).toBeNull();
    expect(result.current.isLoading).toBe(false);
    await act(async () => {
      await result.current.refetch();
    });
    await waitFor(() => expect(result.current.page).toEqual(page()));
    expect(adapters.eventPrograms.loadEventProgramsPage).toHaveBeenCalledTimes(2);
    expect(adapters.activityCatalog.loadCatalog).not.toHaveBeenCalled();
  });

  it("neither loads nor manually refetches without an ADMIN identity", async () => {
    for (const currentUser of [
      undefined,
      createAuthenticatedUser({ globalRole: "USER" }),
      createAuthenticatedUser({ globalRole: "ADMIN" }),
    ]) {
      useSessionStore.getState().clearSession();
      if (currentUser) {
        useSessionStore.getState().setSession({
          currentUser,
          tokens: createAuthTokens({ accessToken: "private-token" }),
        });
      }
      const adapters = adaptersForPage();
      const { result, unmount } = renderHookWithProviders(() => useEventProgramsPage(filters, 1), {
        adapters,
      });

      if (currentUser?.globalRole !== "ADMIN") {
        expect(result.current.isLoading).toBe(false);
        await act(async () => {
          await result.current.refetch();
        });
        expect(adapters.eventPrograms.loadEventProgramsPage).not.toHaveBeenCalled();
        expect(result.current.page).toBeNull();
      } else {
        await waitFor(() => expect(result.current.page).toEqual(page()));
      }
      unmount();
    }
  });

  it("scopes private data by identity without persisting pages or tokens", async () => {
    const adapters = adaptersForPage();
    const queryClient = createQueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result } = renderHookWithProviders(() => useEventProgramsPage(filters, 1), {
      adapters,
      queryClient,
    });
    await waitFor(() => expect(result.current.page).toEqual(page()));
    const key = queryKeys.administrativeEventProgramsPage("user-1", filters, 1);
    expect(queryClient.getQueryData(key)).toEqual(page());
    expect(isPersistedQueryKey(key)).toBe(false);
    expect(
      JSON.stringify(
        queryClient
          .getQueryCache()
          .getAll()
          .map((query) => query.queryKey),
      ),
    ).not.toContain("private-token");

    adapters.eventPrograms.loadEventProgramsPage.mockResolvedValue(
      page([createEventProgramListItem({ id: "other-program" })]),
    );
    act(() =>
      useSessionStore.getState().setSession({
        currentUser: createAuthenticatedUser({ globalRole: "ADMIN", id: "user-2" }),
        tokens: createAuthTokens(),
      }),
    );
    expect(result.current.page).toBeNull();
    await waitFor(() => expect(result.current.page?.items[0]?.id).toBe("other-program"));
    expect(queryClient.getQueryData(key)).toEqual(page());
  });
});
