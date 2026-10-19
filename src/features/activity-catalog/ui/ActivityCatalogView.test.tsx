import { screen, within } from "@testing-library/react";
import { setupUser } from "@/test/user";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { mockActivityCatalog } from "@/data/mock/activityCatalog";
import { useSessionStore } from "@/store/session";
import { useWorkingContextStore } from "@/store/workingContext";
import { createAuthenticatedUser, createAuthTokens } from "@/test/factories";
import { renderWithProviders } from "@/test/render";

import { ActivityCatalogView } from "./ActivityCatalogView";

describe("ActivityCatalogView", () => {
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

  it("should summarize the catalog before listing programs", async () => {
    renderWithProviders(<ActivityCatalogView />);

    expect(await screen.findByText("9 programas")).toBeInTheDocument();
    expect(
      screen.getByText(`${mockActivityCatalog.activities.length} actividades`),
    ).toBeInTheDocument();
    expect(screen.getByText(/personas registradas/i)).toBeInTheDocument();
    expect(screen.getAllByText("No disponible").length).toBeGreaterThan(0);
    expect(screen.getByText("4 unidades")).toBeInTheDocument();
  });

  it("should filter activities by search text", async () => {
    const user = setupUser();

    renderWithProviders(<ActivityCatalogView />);

    await user.type(
      await screen.findByRole("textbox", { name: /buscar actividades/i }),
      "gobernanza",
    );

    const catalog = within(screen.getByRole("region", { name: /catalogo de actividades/i }));

    expect(catalog.getByText(/gobernanza de datos abiertos universitarios/i)).toBeInTheDocument();
    expect(
      catalog.queryByText(/ciberseguridad en servicios estudiantiles/i),
    ).not.toBeInTheDocument();
  });

  it("should select an event program as the working context", async () => {
    const user = setupUser();

    renderWithProviders(<ActivityCatalogView />);

    await user.click(
      await screen.findByRole("button", {
        name: /usar semana de innovacion academica en panel/i,
      }),
    );

    expect(useWorkingContextStore.getState().workingContext).toEqual({
      id: "program-innovation-week",
      kind: "eventProgram",
    });
    expect(await screen.findByText(/contexto activo: semana de innovacion/i)).toBeInTheDocument();
  });

  it("should paginate the activity catalog", async () => {
    const user = setupUser();

    renderWithProviders(<ActivityCatalogView />);

    const pagination = await screen.findByRole("navigation", { name: /paginacion/i });

    expect(within(pagination).getByRole("button", { name: "1" })).toHaveAttribute(
      "aria-current",
      "page",
    );

    await user.click(within(pagination).getByRole("button", { name: /siguiente/i }));

    expect(within(pagination).getByRole("button", { name: "2" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });
});
