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

import { useAlertsPage } from "./useAlertsPage";

const filters = { isRead: false } as const;
const pageResult = createAlertsPage({ page: 2, total: 21, totalPages: 2 });

function buildAlertsAdapter(overrides: Partial<AlertsAdapter> = {}): AlertsAdapter {
  return {
    loadAlertsPage: vi.fn<AlertsAdapter["loadAlertsPage"]>().mockResolvedValue(pageResult),
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

describe("useAlertsPage", () => {
  afterEach(() => useSessionStore.getState().clearSession());

  it("should not query without a session", () => {
    const adapters = buildAdapters();
    const { result } = renderHookWithProviders(() => useAlertsPage(filters, 2), { adapters });

    expect(result.current.page).toBeNull();
    expect(adapters.alerts.loadAlertsPage).not.toHaveBeenCalled();
  });

  it("should not query while the session is not authenticated", () => {
    useSessionStore.setState({
      currentUser: createAuthenticatedUser({ id: "user-1" }),
      status: "restoring",
    });
    const adapters = buildAdapters();

    const { result } = renderHookWithProviders(() => useAlertsPage(filters, 1), { adapters });

    expect(result.current.page).toBeNull();
    expect(adapters.alerts.loadAlertsPage).not.toHaveBeenCalled();
  });

  it("should request one filtered page under the identity key", async () => {
    signIn();
    const queryClient = createQueryClient({ defaultOptions: { queries: { retry: false } } });
    const adapters = buildAdapters();
    const { result } = renderHookWithProviders(() => useAlertsPage(filters, 2), {
      adapters,
      queryClient,
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(adapters.alerts.loadAlertsPage).toHaveBeenCalledWith(filters, 2);
    expect(result.current.page).toEqual(pageResult);
    expect(queryClient.getQueryData(queryKeys.alertsPage("user-1", filters, 2))).toEqual(
      pageResult,
    );
  });

  it("should expose the listing failure", async () => {
    signIn();
    const adapters = buildAdapters({
      alerts: buildAlertsAdapter({
        loadAlertsPage: vi.fn().mockRejectedValue(new Error("alertas caidas")),
      }),
    });
    const { result } = renderHookWithProviders(() => useAlertsPage({}, 1), { adapters });

    await waitFor(() => expect(result.current.error).not.toBeNull());

    expect(result.current.error?.message).toBe("alertas caidas");
  });

  it("should not keep another identity page while the next one loads", async () => {
    signIn();
    const loadAlertsPage = vi.fn<AppAdapters["alerts"]["loadAlertsPage"]>(
      () => new Promise(() => undefined),
    );
    const adapters = buildAdapters({ alerts: buildAlertsAdapter({ loadAlertsPage }) });
    const queryClient = createQueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result, rerender } = renderHookWithProviders(
      () => useAlertsPage({ isRead: false }, 1),
      {
        adapters,
        queryClient,
      },
    );

    await waitFor(() => expect(loadAlertsPage).toHaveBeenCalled());
    queryClient.setQueryData(queryKeys.alertsPage("user-1", { isRead: false }, 1), pageResult);

    useSessionStore.getState().clearSession();
    useSessionStore.getState().setSession({
      currentUser: createAuthenticatedUser({ id: "user-2" }),
      tokens: createAuthTokens(),
    });
    rerender();

    expect(result.current.page).toBeNull();
  });
});
