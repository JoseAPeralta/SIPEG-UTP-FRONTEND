import { waitFor } from "@testing-library/react";
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

import { useUnreadAlertsCount } from "./useUnreadAlertsCount";

function buildAlertsAdapter(overrides: Partial<AlertsAdapter> = {}): AlertsAdapter {
  return {
    loadAlertsPage: vi
      .fn<AlertsAdapter["loadAlertsPage"]>()
      .mockResolvedValue(createAlertsPage({ total: 3 })),
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

function signIn(id = "user-1") {
  useSessionStore.getState().setSession({
    currentUser: createAuthenticatedUser({ id }),
    tokens: createAuthTokens(),
  });
}

describe("useUnreadAlertsCount", () => {
  afterEach(() => useSessionStore.getState().clearSession());

  it("should not query without a session", () => {
    const adapters = buildAdapters();
    const { result } = renderHookWithProviders(() => useUnreadAlertsCount(), { adapters });

    expect(result.current.count).toBeNull();
    expect(adapters.alerts.loadAlertsPage).not.toHaveBeenCalled();
  });

  it("should not query while the session is being restored", () => {
    useSessionStore.setState({ status: "restoring" });
    const adapters = buildAdapters();
    const { result } = renderHookWithProviders(() => useUnreadAlertsCount(), { adapters });

    expect(result.current.count).toBeNull();
    expect(adapters.alerts.loadAlertsPage).not.toHaveBeenCalled();
  });

  it("should request the unread total under the identity page key", async () => {
    signIn();
    const page = createAlertsPage({ items: [], total: 21, totalPages: 2 });
    const adapters = buildAdapters({
      alerts: buildAlertsAdapter({ loadAlertsPage: vi.fn().mockResolvedValue(page) }),
    });
    const queryClient = createQueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result } = renderHookWithProviders(() => useUnreadAlertsCount(), {
      adapters,
      queryClient,
    });

    await waitFor(() => expect(result.current.count).toBe(21));

    expect(adapters.alerts.loadAlertsPage).toHaveBeenCalledWith({ isRead: false }, 1);
    expect(queryClient.getQueryData(queryKeys.alertsPage("user-1", { isRead: false }, 1))).toEqual(
      page,
    );
  });

  it("should expose the failure instead of a zero count", async () => {
    signIn();
    const adapters = buildAdapters({
      alerts: buildAlertsAdapter({
        loadAlertsPage: vi.fn().mockRejectedValue(new Error("alertas caidas")),
      }),
    });
    const { result } = renderHookWithProviders(() => useUnreadAlertsCount(), { adapters });

    await waitFor(() => expect(result.current.error).not.toBeNull());

    expect(result.current.count).toBeNull();
    expect(result.current.error?.message).toBe("alertas caidas");
  });

  it("should not keep the previous identity count while the next one loads", async () => {
    signIn("user-1");
    let resolveNext: ((page: ReturnType<typeof createAlertsPage>) => void) | undefined;
    const loadAlertsPage = vi.fn<AlertsAdapter["loadAlertsPage"]>(() => {
      if (useSessionStore.getState().currentUser?.id === "user-2") {
        return new Promise((resolve) => {
          resolveNext = resolve;
        });
      }
      return Promise.resolve(createAlertsPage({ total: 3 }));
    });
    const adapters = buildAdapters({ alerts: buildAlertsAdapter({ loadAlertsPage }) });
    const { result } = renderHookWithProviders(() => useUnreadAlertsCount(), { adapters });

    await waitFor(() => expect(result.current.count).toBe(3));

    useSessionStore.getState().clearSession();
    signIn("user-2");

    await waitFor(() => expect(loadAlertsPage).toHaveBeenCalledTimes(2));
    expect(result.current.count).toBeNull();

    resolveNext?.(createAlertsPage({ total: 7 }));
    await waitFor(() => expect(result.current.count).toBe(7));
  });

  it("should refresh when the identity alert scope is invalidated", async () => {
    signIn();
    const loadAlertsPage = vi
      .fn<AlertsAdapter["loadAlertsPage"]>()
      .mockResolvedValueOnce(createAlertsPage({ total: 2 }))
      .mockResolvedValueOnce(createAlertsPage({ items: [], total: 0 }));
    const queryClient = createQueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result } = renderHookWithProviders(() => useUnreadAlertsCount(), {
      adapters: buildAdapters({ alerts: buildAlertsAdapter({ loadAlertsPage }) }),
      queryClient,
    });

    await waitFor(() => expect(result.current.count).toBe(2));

    await queryClient.invalidateQueries({ queryKey: queryKeys.alertsScope("user-1") });

    await waitFor(() => expect(result.current.count).toBe(0));
  });
});
