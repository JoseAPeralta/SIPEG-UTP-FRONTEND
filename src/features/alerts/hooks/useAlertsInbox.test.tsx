import { waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createAppAdapters, type AlertsAdapter, type AppAdapters } from "@/app/adapters";
import { useSessionStore } from "@/store/session";
import {
  createAlert,
  createAlertsPage,
  createAuthenticatedUser,
  createAuthTokens,
  createUserScope,
} from "@/test/factories";
import { renderHookWithProviders } from "@/test/render";

import { useAlertsInbox } from "./useAlertsInbox";

const activityAlert = createAlert({
  id: "alert-activity",
  target: { id: "activity-1", kind: "ACTIVITY" },
  type: "ACTIVITY_UPDATED",
});
const proposalAlert = createAlert({
  id: "alert-proposal",
  target: { id: "proposal-1", kind: "PROPOSAL" },
  type: "PROPOSAL_RECEIVED",
});
const accessibleScope = createUserScope({
  id: "activity-1",
  permissions: [{ name: "activity:read", origin: "INHERITED", validFrom: null, validUntil: null }],
  type: "activity",
});

function buildAlertsAdapter(overrides: Partial<AlertsAdapter> = {}): AlertsAdapter {
  return {
    loadAlertsPage: vi
      .fn<AlertsAdapter["loadAlertsPage"]>()
      .mockResolvedValue(createAlertsPage({ items: [activityAlert, proposalAlert] })),
    markAlertRead: vi
      .fn<AlertsAdapter["markAlertRead"]>()
      .mockResolvedValue(createAlert({ id: "alert-activity", isRead: true })),
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
    userScopes: { loadUserScopes: vi.fn().mockResolvedValue([accessibleScope]) },
    ...overrides,
  };
}

function signIn() {
  useSessionStore.getState().setSession({
    currentUser: createAuthenticatedUser({ id: "user-1" }),
    tokens: createAuthTokens(),
  });
}

describe("useAlertsInbox", () => {
  afterEach(() => useSessionStore.getState().clearSession());

  it("should resolve destinations only for scopes the user can access", async () => {
    signIn();
    const { result } = renderHookWithProviders(() => useAlertsInbox({}, 1), {
      adapters: buildAdapters(),
    });

    await waitFor(() => expect(result.current.page).not.toBeNull());
    await waitFor(() => expect(result.current.destinations.size).toBe(1));

    expect(result.current.destinations.get("alert-activity")).toEqual({
      label: "Ver contexto de la actividad",
      to: "/operaciones/actividades/activity-1",
    });
    expect(result.current.destinations.has("alert-proposal")).toBe(false);
  });

  it("should not resolve a destination absent from the discovery", async () => {
    signIn();
    const { result } = renderHookWithProviders(() => useAlertsInbox({}, 1), {
      adapters: buildAdapters({ userScopes: { loadUserScopes: vi.fn().mockResolvedValue([]) } }),
    });

    await waitFor(() => expect(result.current.page).not.toBeNull());

    expect(result.current.destinations.size).toBe(0);
  });

  it("should keep the inbox visible when the discovery fails", async () => {
    signIn();
    const { result } = renderHookWithProviders(() => useAlertsInbox({}, 1), {
      adapters: buildAdapters({
        userScopes: { loadUserScopes: vi.fn().mockRejectedValue(new Error("scopes caidos")) },
      }),
    });

    await waitFor(() => expect(result.current.page).not.toBeNull());
    await waitFor(() => expect(result.current.accessError).not.toBeNull());

    expect(result.current.page?.items).toHaveLength(2);
    expect(result.current.destinations.size).toBe(0);
  });

  it("should not query without a session", () => {
    const adapters = buildAdapters();
    const { result } = renderHookWithProviders(() => useAlertsInbox({}, 1), { adapters });

    expect(result.current.page).toBeNull();
    expect(adapters.alerts.loadAlertsPage).not.toHaveBeenCalled();
    expect(adapters.userScopes.loadUserScopes).not.toHaveBeenCalled();
  });

  it("should expose the read actions and flag the action while pending", async () => {
    signIn();
    let resolveMark: ((alert: ReturnType<typeof createAlert>) => void) | undefined;
    const markAlertRead = vi.fn<AlertsAdapter["markAlertRead"]>(
      () =>
        new Promise((resolve) => {
          resolveMark = resolve;
        }),
    );
    const adapters = buildAdapters({ alerts: buildAlertsAdapter({ markAlertRead }) });
    const { result } = renderHookWithProviders(() => useAlertsInbox({}, 1), { adapters });

    await waitFor(() => expect(result.current.page).not.toBeNull());

    const pending = result.current.markRead(activityAlert);
    await waitFor(() => expect(result.current.isUpdating).toBe(true));

    resolveMark?.(createAlert({ id: "alert-activity", isRead: true }));

    await expect(pending).resolves.toBe(true);
    await waitFor(() => expect(result.current.isUpdating).toBe(false));
    expect(markAlertRead).toHaveBeenCalledWith("alert-activity");
  });

  it("should expose the read failure", async () => {
    signIn();
    const markAlertRead = vi
      .fn<AlertsAdapter["markAlertRead"]>()
      .mockRejectedValue(Object.assign(new Error("detalle interno"), { status: 404 }));
    const adapters = buildAdapters({ alerts: buildAlertsAdapter({ markAlertRead }) });
    const { result } = renderHookWithProviders(() => useAlertsInbox({}, 1), { adapters });

    await waitFor(() => expect(result.current.page).not.toBeNull());

    await expect(result.current.markRead(activityAlert)).resolves.toBe(false);
    await waitFor(() => expect(result.current.readError).not.toBeNull());
    expect(result.current.isUpdating).toBe(false);
  });

  it("should delegate marking all to the adapter", async () => {
    signIn();
    const markAllAlertsRead = vi
      .fn<AlertsAdapter["markAllAlertsRead"]>()
      .mockResolvedValue({ updatedCount: 2 });
    const adapters = buildAdapters({ alerts: buildAlertsAdapter({ markAllAlertsRead }) });
    const { result } = renderHookWithProviders(() => useAlertsInbox({}, 1), { adapters });

    await waitFor(() => expect(result.current.page).not.toBeNull());

    await expect(result.current.markAllRead()).resolves.toEqual({ updatedCount: 2 });
    expect(markAllAlertsRead).toHaveBeenCalledTimes(1);
  });
});
