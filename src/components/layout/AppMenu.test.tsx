import { screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createAppAdapters, type AlertsAdapter, type AppAdapters } from "@/app/adapters";
import { useSessionStore } from "@/store/session";
import { createAuthenticatedUser, createAuthTokens } from "@/test/factories";
import { renderWithProviders } from "@/test/render";

import { AppMenu } from "./AppMenu";

function buildAdapters(overrides: Partial<AppAdapters> = {}): AppAdapters {
  return { ...createAppAdapters({ source: "mock" }), ...overrides };
}

function signIn(globalRole: "ADMIN" | "USER" = "USER") {
  useSessionStore.getState().setSession({
    currentUser: createAuthenticatedUser({ globalRole }),
    tokens: createAuthTokens(),
  });
}

describe("AppMenu alert indicator", () => {
  afterEach(() => useSessionStore.getState().clearSession());

  it("should not show alerts without a session", () => {
    renderWithProviders(<AppMenu />);

    expect(screen.queryByText(/alertas/i)).toBeNull();
  });

  it("should not show alerts while the session is restored", () => {
    useSessionStore.setState({ status: "restoring" });
    renderWithProviders(<AppMenu />);

    expect(screen.queryByText(/alertas/i)).toBeNull();
  });

  it("should show the unread count for a standard user", async () => {
    signIn("USER");
    renderWithProviders(<AppMenu />);

    expect(await screen.findByText("Alertas · 3")).toBeInTheDocument();
    expect(screen.getByText("Tienes 3 alertas sin leer")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Tienes 3 alertas sin leer" })).toHaveAttribute(
      "href",
      "/perfil/alertas",
    );
  });

  it("should show the unread count for an administrator", async () => {
    signIn("ADMIN");
    renderWithProviders(<AppMenu />);

    expect(await screen.findByText("Alertas · 3")).toBeInTheDocument();
  });

  it("should keep the failure visible instead of reporting zero", async () => {
    signIn();
    const alerts: AlertsAdapter = {
      loadAlertsPage: vi.fn().mockRejectedValue(new Error("alertas caidas")),
      markAlertRead: vi.fn().mockRejectedValue(new Error("no usado")),
      markAllAlertsRead: vi.fn().mockRejectedValue(new Error("no usado")),
    };
    renderWithProviders(<AppMenu />, { adapters: buildAdapters({ alerts }) });

    expect(await screen.findByText("Alertas · —")).toBeInTheDocument();
    expect(screen.queryByText("Alertas · 0")).toBeNull();
  });

  it("should remove the count after logout", async () => {
    signIn();
    renderWithProviders(<AppMenu />);
    await screen.findByText("Alertas · 3");

    useSessionStore.getState().clearSession();

    await waitFor(() => expect(screen.queryByText(/alertas/i)).toBeNull());
  });
});
