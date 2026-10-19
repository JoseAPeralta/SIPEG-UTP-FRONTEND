import {
  focusManager,
  onlineManager,
  type QueryClient,
  type QueryClientConfig,
} from "@tanstack/react-query";
import { act, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createAppAdapters, type AlertsAdapter, type AppAdapters } from "@/app/adapters";
import { createQueryClient, queryKeys } from "@/app/query";
import { useSessionStore } from "@/store/session";
import {
  createAlert,
  createAlertsPage,
  createAuthenticatedUser,
  createAuthTokens,
} from "@/test/factories";
import { renderHookWithProviders } from "@/test/render";

import { useAlertsPage } from "./useAlertsPage";
import { useUnreadAlertsCount } from "./useUnreadAlertsCount";

const unreadPage = createAlertsPage({ items: [createAlert({ isRead: false })], total: 3 });

type QueryDefaults = NonNullable<NonNullable<QueryClientConfig["defaultOptions"]>["queries"]>;

/**
 * Defaults deliberadamente contrarios a la politica de alertas. Cada prueba enciende el que
 * necesita refutar: si el hook no aplicara `alertsQueryPolicy`, el default global ganaria.
 */
function hostileConfig(overrides: QueryDefaults = {}): QueryClientConfig {
  return {
    defaultOptions: {
      queries: {
        refetchInterval: false,
        refetchOnMount: false,
        refetchOnReconnect: false,
        refetchOnWindowFocus: false,
        retry: false,
        staleTime: 0,
        ...overrides,
      },
    },
  };
}

function buildAlertsAdapter(overrides: Partial<AlertsAdapter> = {}): AlertsAdapter {
  return {
    loadAlertsPage: vi.fn<AlertsAdapter["loadAlertsPage"]>().mockResolvedValue(unreadPage),
    markAlertRead: vi
      .fn<AlertsAdapter["markAlertRead"]>()
      .mockResolvedValue(createAlert({ isRead: true })),
    markAllAlertsRead: vi
      .fn<AlertsAdapter["markAllAlertsRead"]>()
      .mockResolvedValue({ updatedCount: 1 }),
    ...overrides,
  };
}

function buildAdapters(overrides: Partial<AppAdapters> = {}): AppAdapters {
  return {
    ...createAppAdapters({ source: "mock" }),
    alerts: buildAlertsAdapter(),
    ...overrides,
  };
}

function signIn() {
  useSessionStore.getState().setSession({
    currentUser: createAuthenticatedUser({ id: "user-1" }),
    tokens: createAuthTokens(),
  });
}

function markCacheStale(queryClient: QueryClient) {
  queryClient.setQueryData(queryKeys.alertsPage("user-1", { isRead: false }, 1), unreadPage, {
    updatedAt: Date.now() - 60_000,
  });
}

/** Los eventos de foco y conexion reanudan mutaciones antes de revalidar; el flush los deja correr. */
async function settleRefreshEvents() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

describe("alerts refresh policy", () => {
  afterEach(() => {
    useSessionStore.getState().clearSession();
    focusManager.setFocused(undefined);
    onlineManager.setOnline(true);
    vi.useRealTimers();
  });

  it("should not poll while the inbox stays open", async () => {
    vi.useFakeTimers();
    signIn();
    const adapters = buildAdapters();

    renderHookWithProviders(() => useAlertsPage({ isRead: false }, 1), {
      adapters,
      queryClient: createQueryClient(hostileConfig({ refetchInterval: 1_000 })),
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10 * 60_000);
    });

    expect(adapters.alerts.loadAlertsPage).toHaveBeenCalledTimes(1);
  });

  it("should refetch a stale cached page when the inbox mounts again", async () => {
    signIn();
    const queryClient = createQueryClient(hostileConfig());
    markCacheStale(queryClient);
    const adapters = buildAdapters();

    renderHookWithProviders(() => useAlertsPage({ isRead: false }, 1), { adapters, queryClient });

    await waitFor(() => expect(adapters.alerts.loadAlertsPage).toHaveBeenCalledTimes(1));
  });

  it("should not refetch fresh alerts on focus", async () => {
    signIn();
    const adapters = buildAdapters();
    const { result } = renderHookWithProviders(() => useUnreadAlertsCount(), {
      adapters,
      queryClient: createQueryClient(hostileConfig({ refetchOnWindowFocus: true })),
    });

    await waitFor(() => expect(result.current.count).toBe(3));

    focusManager.setFocused(false);
    focusManager.setFocused(true);
    await settleRefreshEvents();

    expect(adapters.alerts.loadAlertsPage).toHaveBeenCalledTimes(1);
  });

  it("should refetch stale alerts on focus", async () => {
    signIn();
    const queryClient = createQueryClient(hostileConfig());
    const loadAlertsPage = vi
      .fn<AlertsAdapter["loadAlertsPage"]>()
      .mockResolvedValueOnce(unreadPage)
      .mockResolvedValueOnce(createAlertsPage({ items: [], total: 0 }));
    const { result } = renderHookWithProviders(() => useUnreadAlertsCount(), {
      adapters: buildAdapters({ alerts: buildAlertsAdapter({ loadAlertsPage }) }),
      queryClient,
    });

    await waitFor(() => expect(result.current.count).toBe(3));

    markCacheStale(queryClient);
    focusManager.setFocused(false);
    focusManager.setFocused(true);

    await waitFor(() => expect(result.current.count).toBe(0));
    expect(loadAlertsPage).toHaveBeenCalledTimes(2);
  });

  it("should refetch stale alerts on reconnect", async () => {
    signIn();
    const queryClient = createQueryClient(hostileConfig());
    const loadAlertsPage = vi
      .fn<AlertsAdapter["loadAlertsPage"]>()
      .mockResolvedValueOnce(unreadPage)
      .mockResolvedValueOnce(createAlertsPage({ items: [], total: 0 }));
    const { result } = renderHookWithProviders(() => useUnreadAlertsCount(), {
      adapters: buildAdapters({ alerts: buildAlertsAdapter({ loadAlertsPage }) }),
      queryClient,
    });

    await waitFor(() => expect(result.current.count).toBe(3));

    markCacheStale(queryClient);
    onlineManager.setOnline(false);
    onlineManager.setOnline(true);

    await waitFor(() => expect(result.current.count).toBe(0));
    expect(loadAlertsPage).toHaveBeenCalledTimes(2);
  });

  it("should share one request between the inbox and the unread count", async () => {
    signIn();
    const adapters = buildAdapters();
    const { result } = renderHookWithProviders(
      () => ({ count: useUnreadAlertsCount(), page: useAlertsPage({ isRead: false }, 1) }),
      { adapters },
    );

    await waitFor(() => expect(result.current.count.count).toBe(3));

    expect(result.current.page.page).toEqual(unreadPage);
    expect(adapters.alerts.loadAlertsPage).toHaveBeenCalledTimes(1);
  });
});
