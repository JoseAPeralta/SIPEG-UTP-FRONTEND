import { screen } from "@testing-library/react";
import { setupUser } from "@/test/user";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createAppAdapters } from "@/app/adapters";
import { useSessionStore } from "@/store/session";
import { useWorkingContextStore } from "@/store/workingContext";
import { createAuthenticatedUser, createAuthTokens } from "@/test/factories";
import { renderWithProviders } from "@/test/render";

import { WorkingContextSelect } from "./WorkingContextSelect";

describe("WorkingContextSelect", () => {
  beforeEach(() => {
    useWorkingContextStore.getState().clearWorkingContext();
    useSessionStore.getState().setSession({
      currentUser: createAuthenticatedUser(),
      tokens: createAuthTokens(),
    });
  });

  afterEach(() => {
    useSessionStore.getState().clearSession();
  });

  it("should load programs and activities as options", async () => {
    renderWithProviders(<WorkingContextSelect />);

    const select = await screen.findByRole("combobox", { name: /contexto de trabajo/i });

    expect(select).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /todos los programas/i })).toBeInTheDocument();
    expect(
      await screen.findByRole("option", { name: /semana de innovacion academica/i }),
    ).toBeInTheDocument();
  });

  it("should store the selected activity", async () => {
    const user = setupUser();

    renderWithProviders(<WorkingContextSelect />);

    await screen.findByRole("option", { name: /semana de innovacion academica/i });
    await user.selectOptions(
      screen.getByRole("combobox", { name: /contexto de trabajo/i }),
      "activity:activity-open-data-governance",
    );

    expect(useWorkingContextStore.getState().workingContext).toEqual({
      id: "activity-open-data-governance",
      kind: "activity",
    });
    expect(
      await screen.findByText(/las opciones del panel usan: gobernanza de datos abiertos/i),
    ).toBeInTheDocument();
  });

  it("should clear the context when the empty option is selected", async () => {
    const user = setupUser();
    useWorkingContextStore
      .getState()
      .setWorkingContext({ id: "program-innovation-week", kind: "eventProgram" });

    renderWithProviders(<WorkingContextSelect />);

    await screen.findByRole("option", { name: /semana de innovacion academica/i });
    await user.selectOptions(screen.getByRole("combobox", { name: /contexto de trabajo/i }), "");

    expect(useWorkingContextStore.getState().workingContext).toBeNull();
  });

  it("should offer every readable program with its localized status", async () => {
    renderWithProviders(<WorkingContextSelect />);

    const option = await screen.findByRole("option", { name: /competencia de robotica 2024/i });

    expect(option).toHaveTextContent(/archivado/i);
  });

  it("should announce a selection retired by reconciliation", async () => {
    useWorkingContextStore.getState().noteRevokedSelection();

    renderWithProviders(<WorkingContextSelect />);

    expect(
      await screen.findByText(/el contexto seleccionado ya no está disponible/i),
    ).toBeVisible();
  });

  it("should offer a retry when the catalog fails", async () => {
    const adapters = createAppAdapters({ source: "mock" });
    adapters.activityCatalog = {
      ...adapters.activityCatalog,
      loadCatalog: vi.fn().mockRejectedValue(new Error("catalogo caido")),
    };

    renderWithProviders(<WorkingContextSelect />, { adapters });

    expect(
      await screen.findByText(/no se pudieron cargar los contextos de trabajo/i),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeVisible();
  });
});
