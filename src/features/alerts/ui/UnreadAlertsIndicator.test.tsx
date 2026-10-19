import { screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createAppAdapters, type AlertsAdapter, type AppAdapters } from "@/app/adapters";
import { useSessionStore } from "@/store/session";
import {
  createAlert,
  createAlertsPage,
  createAuthenticatedUser,
  createAuthTokens,
} from "@/test/factories";
import { renderWithProviders } from "@/test/render";

import { UnreadAlertsIndicator } from "./UnreadAlertsIndicator";

function buildAdapters(loadAlertsPage: AlertsAdapter["loadAlertsPage"]): AppAdapters {
  return {
    ...createAppAdapters({ source: "mock" }),
    alerts: {
      loadAlertsPage,
      markAlertRead: vi
        .fn<AlertsAdapter["markAlertRead"]>()
        .mockResolvedValue(createAlert({ isRead: true })),
      markAllAlertsRead: vi
        .fn<AlertsAdapter["markAllAlertsRead"]>()
        .mockResolvedValue({ updatedCount: 1 }),
    },
  };
}

function signIn() {
  useSessionStore.getState().setSession({
    currentUser: createAuthenticatedUser({ id: "user-1" }),
    tokens: createAuthTokens(),
  });
}

describe("UnreadAlertsIndicator", () => {
  afterEach(() => useSessionStore.getState().clearSession());

  it("should hide without a session and never query", () => {
    const loadAlertsPage = vi.fn<AlertsAdapter["loadAlertsPage"]>();
    renderWithProviders(<UnreadAlertsIndicator />, { adapters: buildAdapters(loadAlertsPage) });

    expect(screen.queryByText(/alertas/i)).toBeNull();
    expect(loadAlertsPage).not.toHaveBeenCalled();
  });

  it("should link to the personal inbox with the unread total", async () => {
    signIn();
    const loadAlertsPage = vi
      .fn<AlertsAdapter["loadAlertsPage"]>()
      .mockResolvedValue(createAlertsPage({ items: [createAlert()], total: 21, totalPages: 2 }));
    renderWithProviders(<UnreadAlertsIndicator />, { adapters: buildAdapters(loadAlertsPage) });

    const link = await screen.findByRole("link", { name: "Tienes 21 alertas sin leer" });

    expect(link).toHaveAttribute("href", "/perfil/alertas");
    expect(screen.getByText("Alertas · 21")).toBeInTheDocument();
    expect(loadAlertsPage).toHaveBeenCalledWith({ isRead: false }, 1);
  });

  it("should distinguish zero alerts", async () => {
    signIn();
    const loadAlertsPage = vi
      .fn<AlertsAdapter["loadAlertsPage"]>()
      .mockResolvedValue(createAlertsPage({ items: [], total: 0, totalPages: 1 }));
    renderWithProviders(<UnreadAlertsIndicator />, { adapters: buildAdapters(loadAlertsPage) });

    expect(
      await screen.findByRole("link", { name: "No tienes alertas sin leer" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Alertas · 0")).toBeInTheDocument();
  });

  it("should use the singular for one alert", async () => {
    signIn();
    const loadAlertsPage = vi
      .fn<AlertsAdapter["loadAlertsPage"]>()
      .mockResolvedValue(createAlertsPage({ total: 1 }));
    renderWithProviders(<UnreadAlertsIndicator />, { adapters: buildAdapters(loadAlertsPage) });

    expect(
      await screen.findByRole("link", { name: "Tienes 1 alerta sin leer" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Alertas · 1")).toBeInTheDocument();
  });

  it("should keep the link available while loading", () => {
    signIn();
    const loadAlertsPage = vi
      .fn<AlertsAdapter["loadAlertsPage"]>()
      .mockReturnValue(new Promise(() => undefined));
    renderWithProviders(<UnreadAlertsIndicator />, { adapters: buildAdapters(loadAlertsPage) });

    const link = screen.getByRole("link", { name: "Cargando alertas" });

    expect(link).toHaveAttribute("href", "/perfil/alertas");
    expect(screen.getByText("Alertas · …")).toBeInTheDocument();
    expect(screen.queryByText("Alertas · 0")).toBeNull();
  });

  it("should announce the failure instead of reporting zero and keep the link", async () => {
    signIn();
    const loadAlertsPage = vi
      .fn<AlertsAdapter["loadAlertsPage"]>()
      .mockRejectedValue(new Error("alertas caidas"));
    renderWithProviders(<UnreadAlertsIndicator />, { adapters: buildAdapters(loadAlertsPage) });

    const link = await screen.findByRole("link", {
      name: "No se pudo actualizar el conteo de alertas",
    });

    expect(link).toHaveAttribute("href", "/perfil/alertas");
    expect(screen.getByText("Alertas · —")).toBeInTheDocument();
    expect(screen.queryByText("Alertas · 0")).toBeNull();
  });

  it("should mark the personal inbox as the current page", async () => {
    signIn();
    const loadAlertsPage = vi
      .fn<AlertsAdapter["loadAlertsPage"]>()
      .mockResolvedValue(createAlertsPage({ total: 2 }));
    renderWithProviders(<UnreadAlertsIndicator />, {
      adapters: buildAdapters(loadAlertsPage),
      route: "/perfil/alertas",
    });

    const link = await screen.findByRole("link", { name: "Tienes 2 alertas sin leer" });

    expect(link).toHaveAttribute("aria-current", "page");
  });

  it("should announce changes politely without a status role", async () => {
    signIn();
    const loadAlertsPage = vi
      .fn<AlertsAdapter["loadAlertsPage"]>()
      .mockResolvedValue(createAlertsPage({ total: 2 }));
    renderWithProviders(<UnreadAlertsIndicator />, { adapters: buildAdapters(loadAlertsPage) });

    const link = await screen.findByRole("link", { name: "Tienes 2 alertas sin leer" });

    expect(link.firstElementChild).toHaveAttribute("aria-live", "polite");
    expect(screen.queryByRole("status")).toBeNull();
  });
});
