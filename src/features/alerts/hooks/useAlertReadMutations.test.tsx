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
import { useAlertReadMutations } from "./useAlertReadMutations";
import type { Alert, AlertsPage } from "../model/alert";

const unreadAlert = createAlert({ id: "alert-1", isRead: false });
const secondUnreadAlert = createAlert({ id: "alert-2", isRead: false });
const readAlert = createAlert({ id: "alert-3", isRead: true });

function buildAlertsAdapter(overrides: Partial<AlertsAdapter> = {}): AlertsAdapter {
  return {
    loadAlertsPage: vi.fn<AlertsAdapter["loadAlertsPage"]>().mockResolvedValue(createAlertsPage()),
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

function pageData(queryClient: ReturnType<typeof createQueryClient>, filters = {}, page = 1) {
  return queryClient.getQueryData<AlertsPage>(queryKeys.alertsPage("user-1", filters, page));
}

describe("useAlertReadMutations", () => {
  afterEach(() => useSessionStore.getState().clearSession());

  it("should optimistically mark one alert and shrink the unread total", async () => {
    signIn();
    const queryClient = createQueryClient({ defaultOptions: { queries: { retry: false } } });
    const unreadKey = queryKeys.alertsPage("user-1", { isRead: false }, 1);

    queryClient.setQueryData(
      unreadKey,
      createAlertsPage({ items: [unreadAlert, secondUnreadAlert], total: 2 }),
    );

    let resolveMark: ((alert: Alert) => void) | undefined;
    const markAlertRead = vi.fn<AlertsAdapter["markAlertRead"]>(
      () =>
        new Promise((resolve) => {
          resolveMark = resolve;
        }),
    );
    const { result } = renderHookWithProviders(() => useAlertReadMutations(), {
      adapters: buildAdapters({ alerts: buildAlertsAdapter({ markAlertRead }) }),
      queryClient,
    });

    const pending = result.current.markRead(unreadAlert);

    await waitFor(() => expect(pageData(queryClient, { isRead: false })?.total).toBe(1));
    expect(pageData(queryClient, { isRead: false })?.items.map((alert) => alert.id)).toEqual([
      "alert-2",
    ]);

    resolveMark?.(createAlert({ id: "alert-1", isRead: true }));
    await expect(pending).resolves.toBe(true);
  });

  it("should restore every page and the unread total when the mark fails", async () => {
    signIn();
    const queryClient = createQueryClient({ defaultOptions: { queries: { retry: false } } });
    const unreadKey = queryKeys.alertsPage("user-1", { isRead: false }, 1);
    const allKey = queryKeys.alertsPage("user-1", {}, 1);

    queryClient.setQueryData(unreadKey, createAlertsPage({ items: [unreadAlert], total: 1 }));
    queryClient.setQueryData(allKey, createAlertsPage({ items: [unreadAlert], total: 1 }));

    const markAlertRead = vi
      .fn<AlertsAdapter["markAlertRead"]>()
      .mockRejectedValue(Object.assign(new Error("no existe"), { status: 404 }));
    const { result } = renderHookWithProviders(() => useAlertReadMutations(), {
      adapters: buildAdapters({ alerts: buildAlertsAdapter({ markAlertRead }) }),
      queryClient,
    });

    await expect(result.current.markRead(unreadAlert)).resolves.toBe(false);

    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(pageData(queryClient, { isRead: false })?.total).toBe(1);
    expect(pageData(queryClient, { isRead: false })?.items[0]?.isRead).toBe(false);
    expect(pageData(queryClient, {})?.items[0]?.isRead).toBe(false);
  });

  it("should clear unread pages and read every cached alert when marking all", async () => {
    signIn();
    const queryClient = createQueryClient({ defaultOptions: { queries: { retry: false } } });
    const unreadKey = queryKeys.alertsPage("user-1", { isRead: false }, 1);
    const allKey = queryKeys.alertsPage("user-1", {}, 1);
    const readKey = queryKeys.alertsPage("user-1", { isRead: true }, 1);

    queryClient.setQueryData(
      unreadKey,
      createAlertsPage({ items: [unreadAlert, secondUnreadAlert], total: 2 }),
    );
    queryClient.setQueryData(
      allKey,
      createAlertsPage({ items: [unreadAlert, secondUnreadAlert], total: 2 }),
    );
    queryClient.setQueryData(readKey, createAlertsPage({ items: [readAlert], total: 3 }));

    const markAllAlertsRead = vi
      .fn<AlertsAdapter["markAllAlertsRead"]>()
      .mockResolvedValue({ updatedCount: 2 });
    const { result } = renderHookWithProviders(() => useAlertReadMutations(), {
      adapters: buildAdapters({ alerts: buildAlertsAdapter({ markAllAlertsRead }) }),
      queryClient,
    });

    await expect(result.current.markAllRead()).resolves.toEqual({ updatedCount: 2 });

    expect(pageData(queryClient, { isRead: false })?.items).toEqual([]);
    expect(pageData(queryClient, { isRead: false })?.total).toBe(0);
    expect(pageData(queryClient, {})?.items.every((alert) => alert.isRead)).toBe(true);
    expect(pageData(queryClient, { isRead: true })?.items[0]?.isRead).toBe(true);
    expect(markAllAlertsRead).toHaveBeenCalledTimes(1);
  });

  it("should restore the unread pages when marking all fails", async () => {
    signIn();
    const queryClient = createQueryClient({ defaultOptions: { queries: { retry: false } } });
    const unreadKey = queryKeys.alertsPage("user-1", { isRead: false }, 1);

    queryClient.setQueryData(
      unreadKey,
      createAlertsPage({ items: [unreadAlert, secondUnreadAlert], total: 2 }),
    );

    const markAllAlertsRead = vi
      .fn<AlertsAdapter["markAllAlertsRead"]>()
      .mockRejectedValue(new Error("servicio caido"));
    const { result } = renderHookWithProviders(() => useAlertReadMutations(), {
      adapters: buildAdapters({ alerts: buildAlertsAdapter({ markAllAlertsRead }) }),
      queryClient,
    });

    await expect(result.current.markAllRead()).resolves.toBeUndefined();

    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(pageData(queryClient, { isRead: false })?.total).toBe(2);
    expect(pageData(queryClient, { isRead: false })?.items).toHaveLength(2);
  });

  it("should keep a single read action in flight", async () => {
    signIn();
    let resolveMark: ((alert: Alert) => void) | undefined;
    const markAlertRead = vi.fn<AlertsAdapter["markAlertRead"]>(
      () =>
        new Promise((resolve) => {
          resolveMark = resolve;
        }),
    );
    const { result } = renderHookWithProviders(() => useAlertReadMutations(), {
      adapters: buildAdapters({ alerts: buildAlertsAdapter({ markAlertRead }) }),
    });

    const first = result.current.markRead(unreadAlert);
    const second = result.current.markRead(secondUnreadAlert);

    await expect(second).resolves.toBe(false);
    expect(markAlertRead).toHaveBeenCalledTimes(1);

    resolveMark?.(createAlert({ id: "alert-1", isRead: true }));
    await expect(first).resolves.toBe(true);
  });

  it("should revalidate the identity scope after a successful action", async () => {
    signIn();
    const loadAlertsPage = vi
      .fn<AlertsAdapter["loadAlertsPage"]>()
      .mockResolvedValue(createAlertsPage({ items: [], total: 0 }));
    const { result } = renderHookWithProviders(
      () => ({ page: useAlertsPage({}, 1), read: useAlertReadMutations() }),
      { adapters: buildAdapters({ alerts: buildAlertsAdapter({ loadAlertsPage }) }) },
    );

    await waitFor(() => expect(loadAlertsPage).toHaveBeenCalledTimes(1));

    await result.current.read.markAllRead();

    await waitFor(() => expect(loadAlertsPage).toHaveBeenCalledTimes(2));
  });

  it("should not write or refetch the previous identity after a late failure", async () => {
    signIn("user-1");
    const queryClient = createQueryClient({ defaultOptions: { queries: { retry: false } } });
    const unreadKey = queryKeys.alertsPage("user-1", { isRead: false }, 1);

    queryClient.setQueryData(unreadKey, createAlertsPage({ items: [unreadAlert], total: 1 }));

    let rejectMark: ((error: unknown) => void) | undefined;
    const loadAlertsPage = vi
      .fn<AlertsAdapter["loadAlertsPage"]>()
      .mockResolvedValue(createAlertsPage({ items: [], total: 0 }));
    const markAlertRead = vi.fn<AlertsAdapter["markAlertRead"]>(
      () =>
        new Promise((_, reject) => {
          rejectMark = reject;
        }),
    );
    const { result } = renderHookWithProviders(() => useAlertReadMutations(), {
      adapters: buildAdapters({ alerts: buildAlertsAdapter({ loadAlertsPage, markAlertRead }) }),
      queryClient,
    });

    const pending = result.current.markRead(unreadAlert);

    await waitFor(() => expect(pageData(queryClient, { isRead: false })?.total).toBe(0));

    useSessionStore.getState().clearSession();
    signIn("user-2");

    rejectMark?.(Object.assign(new Error("no existe"), { status: 404 }));
    await expect(pending).resolves.toBe(false);

    expect(loadAlertsPage).not.toHaveBeenCalled();
    expect(
      queryClient.getQueryData(queryKeys.alertsPage("user-2", { isRead: false }, 1)),
    ).toBeUndefined();
  });

  it("should invalidate inactive pages without refetching them", async () => {
    signIn();
    const queryClient = createQueryClient({ defaultOptions: { queries: { retry: false } } });
    const pageTwoKey = queryKeys.alertsPage("user-1", { isRead: false }, 2);
    const loadAlertsPage = vi
      .fn<AlertsAdapter["loadAlertsPage"]>()
      .mockResolvedValue(createAlertsPage({ items: [], total: 0 }));
    const markAllAlertsRead = vi
      .fn<AlertsAdapter["markAllAlertsRead"]>()
      .mockResolvedValue({ updatedCount: 2 });

    queryClient.setQueryData(
      queryKeys.alertsPage("user-1", { isRead: false }, 1),
      createAlertsPage({ items: [unreadAlert], total: 2 }),
    );
    queryClient.setQueryData(
      pageTwoKey,
      createAlertsPage({ page: 2, items: [secondUnreadAlert], total: 2 }),
    );

    const { result } = renderHookWithProviders(() => useAlertReadMutations(), {
      adapters: buildAdapters({
        alerts: buildAlertsAdapter({ loadAlertsPage, markAllAlertsRead }),
      }),
      queryClient,
    });

    await expect(result.current.markAllRead()).resolves.toEqual({ updatedCount: 2 });

    expect(pageData(queryClient, { isRead: false }, 2)?.items).toEqual([]);
    expect(queryClient.getQueryState(pageTwoKey)?.isInvalidated).toBe(true);
    expect(loadAlertsPage).not.toHaveBeenCalled();
  });

  it("should not invalidate another identity's cached alerts", async () => {
    signIn();
    const queryClient = createQueryClient({ defaultOptions: { queries: { retry: false } } });
    const foreignKey = queryKeys.alertsPage("user-2", { isRead: false }, 1);
    const foreignPage = createAlertsPage({ items: [unreadAlert], total: 1 });

    queryClient.setQueryData(foreignKey, foreignPage);

    const { result } = renderHookWithProviders(() => useAlertReadMutations(), {
      adapters: buildAdapters(),
      queryClient,
    });

    await result.current.markAllRead();

    expect(queryClient.getQueryData(foreignKey)).toEqual(foreignPage);
    expect(queryClient.getQueryState(foreignKey)?.isInvalidated).toBe(false);
  });

  it("should reconcile the observed page with the backend after a failed optimistic update", async () => {
    signIn();
    const queryClient = createQueryClient({ defaultOptions: { queries: { retry: false } } });
    const loadAlertsPage = vi
      .fn<AlertsAdapter["loadAlertsPage"]>()
      .mockResolvedValue(createAlertsPage({ items: [unreadAlert], total: 1 }));
    const markAlertRead = vi
      .fn<AlertsAdapter["markAlertRead"]>()
      .mockRejectedValue(new Error("servicio caido"));

    const { result } = renderHookWithProviders(
      () => ({ page: useAlertsPage({ isRead: false }, 1), read: useAlertReadMutations() }),
      {
        adapters: buildAdapters({ alerts: buildAlertsAdapter({ loadAlertsPage, markAlertRead }) }),
        queryClient,
      },
    );

    await waitFor(() => expect(loadAlertsPage).toHaveBeenCalledTimes(1));

    await expect(result.current.read.markRead(unreadAlert)).resolves.toBe(false);

    await waitFor(() => expect(loadAlertsPage).toHaveBeenCalledTimes(2));
    expect(pageData(queryClient, { isRead: false })?.items).toEqual([unreadAlert]);
  });

  it("should ignore a late failure from a discarded session of the same account", async () => {
    signIn("user-1");
    const queryClient = createQueryClient({ defaultOptions: { queries: { retry: false } } });
    const unreadKey = queryKeys.alertsPage("user-1", { isRead: false }, 1);

    queryClient.setQueryData(unreadKey, createAlertsPage({ items: [unreadAlert], total: 1 }));

    let rejectMark: ((error: unknown) => void) | undefined;
    const markAlertRead = vi.fn<AlertsAdapter["markAlertRead"]>(
      () =>
        new Promise((_resolve, reject) => {
          rejectMark = reject;
        }),
    );
    const { result } = renderHookWithProviders(() => useAlertReadMutations(), {
      adapters: buildAdapters({ alerts: buildAlertsAdapter({ markAlertRead }) }),
      queryClient,
    });

    const pending = result.current.markRead(unreadAlert);

    await waitFor(() => expect(pageData(queryClient, { isRead: false })?.total).toBe(0));

    // Logout y re-login con la misma cuenta: la sesion anterior ya no es la actual.
    useSessionStore.getState().clearSession();
    signIn("user-1");

    rejectMark?.(Object.assign(new Error("no existe"), { status: 404 }));
    await expect(pending).resolves.toBe(false);

    expect(pageData(queryClient, { isRead: false })?.total).toBe(0);
    expect(queryClient.getQueryState(unreadKey)?.isInvalidated).toBe(false);
    expect(markAlertRead).toHaveBeenCalledTimes(1);
  });

  it("should not resurrect a cleared snapshot after the session is discarded", async () => {
    signIn("user-1");
    const queryClient = createQueryClient({ defaultOptions: { queries: { retry: false } } });
    const unreadKey = queryKeys.alertsPage("user-1", { isRead: false }, 1);

    queryClient.setQueryData(unreadKey, createAlertsPage({ items: [unreadAlert], total: 1 }));

    let rejectMark: ((error: unknown) => void) | undefined;
    const markAlertRead = vi.fn<AlertsAdapter["markAlertRead"]>(
      () =>
        new Promise((_resolve, reject) => {
          rejectMark = reject;
        }),
    );
    const { result } = renderHookWithProviders(() => useAlertReadMutations(), {
      adapters: buildAdapters({ alerts: buildAlertsAdapter({ markAlertRead }) }),
      queryClient,
    });

    const pending = result.current.markRead(unreadAlert);

    await waitFor(() => expect(pageData(queryClient, { isRead: false })?.total).toBe(0));

    useSessionStore.getState().clearSession();
    queryClient.clear();
    signIn("user-1");

    rejectMark?.(Object.assign(new Error("no existe"), { status: 404 }));
    await expect(pending).resolves.toBe(false);

    expect(queryClient.getQueryData(unreadKey)).toBeUndefined();
  });

  it("should not revalidate a discarded session after a late success", async () => {
    signIn("user-1");
    const queryClient = createQueryClient({ defaultOptions: { queries: { retry: false } } });
    const loadAlertsPage = vi
      .fn<AlertsAdapter["loadAlertsPage"]>()
      .mockResolvedValue(createAlertsPage({ items: [], total: 0 }));
    let resolveMark: ((alert: Alert) => void) | undefined;
    const markAlertRead = vi.fn<AlertsAdapter["markAlertRead"]>(
      () =>
        new Promise((resolve) => {
          resolveMark = resolve;
        }),
    );
    const { result } = renderHookWithProviders(
      () => ({ page: useAlertsPage({ isRead: false }, 1), read: useAlertReadMutations() }),
      {
        adapters: buildAdapters({ alerts: buildAlertsAdapter({ loadAlertsPage, markAlertRead }) }),
        queryClient,
      },
    );

    await waitFor(() => expect(loadAlertsPage).toHaveBeenCalledTimes(1));

    const pending = result.current.read.markRead(unreadAlert);

    await waitFor(() => expect(markAlertRead).toHaveBeenCalledTimes(1));

    act(() => {
      useSessionStore.getState().clearSession();
      signIn("user-1");
    });

    resolveMark?.(createAlert({ id: "alert-1", isRead: true }));
    await expect(pending).resolves.toBe(true);

    await act(async () => {
      await Promise.resolve();
    });
    expect(loadAlertsPage).toHaveBeenCalledTimes(1);
  });

  it("should not block a new session behind a discarded action still in flight", async () => {
    signIn("user-1");
    let resolveFirst: ((alert: Alert) => void) | undefined;
    const markAlertRead = vi
      .fn<AlertsAdapter["markAlertRead"]>()
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveFirst = resolve;
          }),
      )
      .mockResolvedValueOnce(createAlert({ id: "alert-2", isRead: true }));
    const { result } = renderHookWithProviders(() => useAlertReadMutations(), {
      adapters: buildAdapters({ alerts: buildAlertsAdapter({ markAlertRead }) }),
    });

    const first = result.current.markRead(unreadAlert);

    await waitFor(() => expect(markAlertRead).toHaveBeenCalledTimes(1));

    useSessionStore.getState().clearSession();
    signIn("user-1");

    await expect(result.current.markRead(secondUnreadAlert)).resolves.toBe(true);
    expect(markAlertRead).toHaveBeenCalledTimes(2);

    resolveFirst?.(createAlert({ id: "alert-1", isRead: true }));
    await expect(first).resolves.toBe(true);
  });
});
