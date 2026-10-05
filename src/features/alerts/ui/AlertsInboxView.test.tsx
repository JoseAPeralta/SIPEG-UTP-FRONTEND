import { screen, waitFor, within } from "@testing-library/react";
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
import { renderWithProviders } from "@/test/render";
import { setupUser } from "@/test/user";
import { formatDateTime } from "@/utils/dateFormatting";

import type { Alert } from "../model/alert";

import { AlertsInboxView } from "./AlertsInboxView";

type Adapters = {
  alerts?: AlertsAdapter;
  loadAlertsPage?: AlertsAdapter["loadAlertsPage"];
  loadUserScopes?: AppAdapters["userScopes"]["loadUserScopes"];
};

const activityAlert = createAlert({
  id: "alert-activity",
  isRead: false,
  target: { id: "activity-1", kind: "ACTIVITY" },
  type: "ACTIVITY_UPDATED",
});
const proposalAlert = createAlert({
  createdAt: "2026-06-10T13:00:00.000Z",
  id: "alert-proposal",
  isRead: true,
  target: { id: "proposal-1", kind: "PROPOSAL" },
  type: "PROPOSAL_RECEIVED",
});
const accessibleScope = createUserScope({
  id: "activity-1",
  name: "Taller accesible",
  permissions: [{ name: "activity:read", origin: "INHERITED", validFrom: null, validUntil: null }],
  type: "activity",
});

/**
 * Bandeja mutable de prueba: las lecturas y las mutaciones comparten el mismo arreglo, de modo que
 * una revalidacion posterior confirma el cambio en lugar de resucitar el dato original.
 */
function createStatefulAlertsAdapter(
  initial: Alert[],
  { failReads = false }: { failReads?: boolean } = {},
): AlertsAdapter {
  let inbox = initial.map((alert) => structuredClone(alert));

  return {
    loadAlertsPage(filters, page) {
      const filtered = inbox
        .filter((alert) => filters.isRead === undefined || alert.isRead === filters.isRead)
        .filter((alert) => !filters.type || alert.type === filters.type)
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
      const totalPages = Math.max(1, Math.ceil(filtered.length / 20));
      const start = (Math.max(1, page) - 1) * 20;

      return Promise.resolve({
        items: structuredClone(filtered.slice(start, start + 20)),
        limit: 20,
        page,
        total: filtered.length,
        totalPages,
      });
    },
    markAlertRead(id) {
      if (failReads) {
        return Promise.reject(
          Object.assign(new Error("detalle interno del backend"), { status: 500 }),
        );
      }

      const alert = inbox.find((candidate) => candidate.id === id);
      if (!alert) {
        return Promise.reject(Object.assign(new Error("no existe"), { status: 404 }));
      }

      alert.isRead = true;

      return Promise.resolve(structuredClone(alert));
    },
    markAllAlertsRead() {
      if (failReads) {
        return Promise.reject(
          Object.assign(new Error("detalle interno del backend"), { status: 500 }),
        );
      }

      const updatedCount = inbox.filter((alert) => !alert.isRead).length;
      inbox = inbox.map((alert) => ({ ...alert, isRead: true }));

      return Promise.resolve({ updatedCount });
    },
  };
}

function buildAdapters({ alerts, loadAlertsPage, loadUserScopes }: Adapters = {}): AppAdapters {
  return {
    ...createAppAdapters({ source: "mock" }),
    alerts: alerts ?? {
      loadAlertsPage:
        loadAlertsPage ??
        vi
          .fn<AlertsAdapter["loadAlertsPage"]>()
          .mockResolvedValue(createAlertsPage({ items: [activityAlert, proposalAlert], total: 2 })),
      markAlertRead: vi
        .fn<AlertsAdapter["markAlertRead"]>()
        .mockResolvedValue(createAlert({ id: "unused", isRead: true })),
      markAllAlertsRead: vi
        .fn<AlertsAdapter["markAllAlertsRead"]>()
        .mockResolvedValue({ updatedCount: 0 }),
    },
    userScopes: {
      loadUserScopes:
        loadUserScopes ??
        vi.fn<AppAdapters["userScopes"]["loadUserScopes"]>().mockResolvedValue([accessibleScope]),
    },
  };
}

function signIn() {
  useSessionStore.getState().setSession({
    currentUser: createAuthenticatedUser({ id: "user-1" }),
    tokens: createAuthTokens(),
  });
}

function renderView(adapters: AppAdapters) {
  return renderWithProviders(<AlertsInboxView />, { adapters });
}

describe("AlertsInboxView", () => {
  afterEach(() => useSessionStore.getState().clearSession());

  it("should translate types and read states without raw codes", async () => {
    signIn();
    renderView(buildAdapters());

    const list = await screen.findByRole("list", { name: /lista de alertas/i });

    expect(within(list).getByText("Actividad actualizada")).toBeInTheDocument();
    expect(within(list).getByText("Propuesta recibida")).toBeInTheDocument();
    expect(within(list).getByText("Sin leer")).toBeInTheDocument();
    expect(within(list).getByText("Leída")).toBeInTheDocument();
    expect(within(list).getByText(formatDateTime(activityAlert.createdAt))).toBeInTheDocument();
    expect(screen.queryByText("ACTIVITY_UPDATED")).toBeNull();
  });

  it("should explain an inbox without alerts", async () => {
    signIn();
    renderView(
      buildAdapters({
        loadAlertsPage: vi
          .fn<AlertsAdapter["loadAlertsPage"]>()
          .mockResolvedValue(createAlertsPage({ items: [], total: 0, totalPages: 1 })),
      }),
    );

    expect(await screen.findByText(/no tienes alertas/i)).toBeInTheDocument();
  });

  it("should distinguish an empty filtered result from an empty inbox", async () => {
    signIn();
    const user = setupUser();
    const loadAlertsPage = vi.fn<AlertsAdapter["loadAlertsPage"]>((filters) =>
      Promise.resolve(
        filters.type === "PROGRAM_UPDATED"
          ? createAlertsPage({ items: [], total: 0, totalPages: 1 })
          : createAlertsPage({ items: [activityAlert], total: 1 }),
      ),
    );
    renderView(buildAdapters({ loadAlertsPage }));

    await screen.findByRole("list", { name: /lista de alertas/i });
    await user.selectOptions(screen.getByRole("combobox", { name: "Tipo" }), "PROGRAM_UPDATED");

    expect(await screen.findByText(/no hay alertas que coincidan/i)).toBeInTheDocument();
  });

  it("should apply the read filter and return to the first page", async () => {
    signIn();
    const user = setupUser();
    const loadAlertsPage = vi
      .fn<AlertsAdapter["loadAlertsPage"]>()
      .mockResolvedValue(createAlertsPage({ items: [activityAlert], total: 21, totalPages: 2 }));
    renderView(buildAdapters({ loadAlertsPage }));

    await screen.findByRole("list", { name: /lista de alertas/i });
    await user.click(screen.getByRole("button", { name: "Siguiente" }));
    await waitFor(() => expect(loadAlertsPage).toHaveBeenLastCalledWith({}, 2));

    await user.selectOptions(screen.getByRole("combobox", { name: "Estado" }), "unread");

    await waitFor(() => expect(loadAlertsPage).toHaveBeenLastCalledWith({ isRead: false }, 1));
  });

  it("should page with the alert item label", async () => {
    signIn();
    renderView(
      buildAdapters({
        loadAlertsPage: vi
          .fn<AlertsAdapter["loadAlertsPage"]>()
          .mockResolvedValue(
            createAlertsPage({ items: [activityAlert], total: 21, totalPages: 2 }),
          ),
      }),
    );

    expect(await screen.findByText(/1–20 de 21 alertas/i)).toBeInTheDocument();
  });

  it("should link only destinations backed by an accessible scope", async () => {
    signIn();
    renderView(buildAdapters());

    const list = await screen.findByRole("list", { name: /lista de alertas/i });
    const link = within(list).getByRole("link", { name: "Ver contexto de la actividad" });

    expect(link).toHaveAttribute("href", "/operaciones/actividades/activity-1");
    expect(within(list).getByText("Propuesta recibida")).toBeInTheDocument();
    expect(within(list).queryByRole("link", { name: /propuesta/i })).toBeNull();
    expect(within(list).queryByRole("link", { name: /certificado/i })).toBeNull();
  });

  it("should keep the inbox visible and offer a retry when the discovery fails", async () => {
    signIn();
    const user = setupUser();
    const loadUserScopes = vi
      .fn<AppAdapters["userScopes"]["loadUserScopes"]>()
      .mockRejectedValue(new Error("scopes caidos"));
    renderView(buildAdapters({ loadUserScopes }));

    expect(await screen.findByRole("list", { name: /lista de alertas/i })).toBeInTheDocument();
    expect(
      await screen.findByText(/no se pudo comprobar el acceso a los destinos/i),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /reintentar verificaci[oó]n/i }));

    await waitFor(() => expect(loadUserScopes).toHaveBeenCalledTimes(2));
  });

  it("should expose the listing failure with retry and keep the filters", async () => {
    signIn();
    renderView(
      buildAdapters({
        loadAlertsPage: vi
          .fn<AlertsAdapter["loadAlertsPage"]>()
          .mockRejectedValue(new Error("alertas caidas")),
      }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent("alertas caidas");
    expect(screen.getByRole("button", { name: /^reintentar$/i })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Estado" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Tipo" })).toBeInTheDocument();
  });

  it("should offer marking only for unread alerts and a bulk action", async () => {
    signIn();
    renderView(buildAdapters());

    const list = await screen.findByRole("list", { name: /lista de alertas/i });

    expect(within(list).getAllByRole("button", { name: "Marcar como leída" })).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Marcar todas como leídas" })).toBeInTheDocument();
  });

  it("should mark one alert as read and announce it", async () => {
    signIn();
    const user = setupUser();
    renderView(
      buildAdapters({ alerts: createStatefulAlertsAdapter([activityAlert, proposalAlert]) }),
    );

    const list = await screen.findByRole("list", { name: /lista de alertas/i });

    await user.click(within(list).getByRole("button", { name: "Marcar como leída" }));

    expect(await screen.findByText("Alerta marcada como leída.")).toBeInTheDocument();
    await waitFor(() =>
      expect(within(list).queryByRole("button", { name: "Marcar como leída" })).toBeNull(),
    );
    expect(within(list).getAllByText("Leída")).toHaveLength(2);
  });

  it("should mark every alert as read and report the server count", async () => {
    signIn();
    const user = setupUser();
    const firstUnread = createAlert({ id: "alert-a", isRead: false, type: "ACTIVITY_UPDATED" });
    const secondUnread = createAlert({
      id: "alert-b",
      isRead: false,
      type: "PROGRAM_UPDATED",
    });
    renderView(buildAdapters({ alerts: createStatefulAlertsAdapter([firstUnread, secondUnread]) }));

    const list = await screen.findByRole("list", { name: /lista de alertas/i });

    await user.click(screen.getByRole("button", { name: "Marcar todas como leídas" }));

    expect(await screen.findByText("Se marcaron 2 alertas como leídas.")).toBeInTheDocument();
    await waitFor(() =>
      expect(within(list).queryAllByRole("button", { name: "Marcar como leída" })).toHaveLength(0),
    );
    expect(within(list).getAllByText("Leída")).toHaveLength(2);
  });

  it("should explain that there was nothing unread to mark", async () => {
    signIn();
    const user = setupUser();
    renderView(buildAdapters({ alerts: createStatefulAlertsAdapter([proposalAlert]) }));

    await screen.findByRole("list", { name: /lista de alertas/i });
    await user.click(screen.getByRole("button", { name: "Marcar todas como leídas" }));

    expect(await screen.findByText("No había alertas sin leer.")).toBeInTheDocument();
  });

  it("should restore the alert and show a localized message when marking fails", async () => {
    signIn();
    const user = setupUser();
    renderView(
      buildAdapters({
        alerts: createStatefulAlertsAdapter([activityAlert, proposalAlert], { failReads: true }),
      }),
    );

    const list = await screen.findByRole("list", { name: /lista de alertas/i });

    await user.click(within(list).getByRole("button", { name: "Marcar como leída" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /no se pudo actualizar el estado de lectura/i,
    );
    expect(screen.queryByText(/detalle interno del backend/i)).toBeNull();
    expect(await within(list).findByText("Sin leer")).toBeInTheDocument();
    expect(within(list).getByRole("button", { name: "Marcar como leída" })).toBeEnabled();
  });

  it("should restore the unread alert and the error on a failed bulk action", async () => {
    signIn();
    const user = setupUser();
    renderView(
      buildAdapters({
        alerts: createStatefulAlertsAdapter([activityAlert, proposalAlert], { failReads: true }),
      }),
    );

    const list = await screen.findByRole("list", { name: /lista de alertas/i });

    await user.click(screen.getByRole("button", { name: "Marcar todas como leídas" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /no se pudo actualizar el estado de lectura/i,
    );
    expect(within(list).getByText("Sin leer")).toBeInTheDocument();
  });

  it("should move focus to the list when a card changes in place", async () => {
    signIn();
    const user = setupUser();
    renderView(
      buildAdapters({ alerts: createStatefulAlertsAdapter([activityAlert, proposalAlert]) }),
    );

    const list = await screen.findByRole("list", { name: /lista de alertas/i });

    await user.click(within(list).getByRole("button", { name: "Marcar como leída" }));

    await waitFor(() =>
      expect(screen.getByRole("list", { name: /lista de alertas/i })).toHaveFocus(),
    );
  });

  it("should move focus to the empty state when the last unread alert disappears", async () => {
    signIn();
    const user = setupUser();
    renderView(buildAdapters({ alerts: createStatefulAlertsAdapter([activityAlert]) }));

    await screen.findByRole("list", { name: /lista de alertas/i });
    await user.selectOptions(screen.getByRole("combobox", { name: "Estado" }), "unread");
    await screen.findByRole("list", { name: /lista de alertas/i });

    await user.click(screen.getByRole("button", { name: "Marcar como leída" }));

    const empty = await screen.findByRole("group", { name: /resultado de alertas/i });

    await waitFor(() => expect(empty).toHaveFocus());
    expect(screen.queryByRole("list", { name: /lista de alertas/i })).toBeNull();
  });

  it("should allow marking alerts when the scope discovery fails", async () => {
    signIn();
    const user = setupUser();
    renderView(
      buildAdapters({
        alerts: createStatefulAlertsAdapter([activityAlert]),
        loadUserScopes: vi.fn().mockRejectedValue(new Error("scopes caidos")),
      }),
    );

    await screen.findByText(/no se pudo comprobar el acceso a los destinos/i);
    await user.click(screen.getByRole("button", { name: "Marcar como leída" }));

    expect(await screen.findByText("Alerta marcada como leída.")).toBeInTheDocument();
  });
});
