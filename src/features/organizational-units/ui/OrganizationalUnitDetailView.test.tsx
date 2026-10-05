import { screen } from "@testing-library/react";
import { setupUser } from "@/test/user";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createAppAdapters } from "@/app/adapters";
import {
  createAuthenticatedUser,
  createAuthTokens,
  createOrganizationalUnit,
} from "@/test/factories";
import { renderWithProviders } from "@/test/render";
import { useSessionStore } from "@/store/session";

import { OrganizationalUnitDetailView } from "./OrganizationalUnitDetailView";

const busyDetail = {
  ...createOrganizationalUnit({ id: "fisc", name: "Facultad de Sistemas" }),
  careers: [{ code: "LICS", id: "career-1", name: "Licenciatura en Sistemas" }],
  defaultProgram: {
    id: "program-fisc",
    name: "Agenda permanente",
    status: "ACTIVE" as const,
  },
};

beforeEach(() => {
  useSessionStore.getState().setSession({
    currentUser: createAuthenticatedUser({ globalRole: "ADMIN" }),
    tokens: createAuthTokens(),
  });
});

describe("OrganizationalUnitDetailView", () => {
  it("edits the unit and shows the default program and careers", async () => {
    const user = setupUser();
    const updateOrganizationalUnit = vi
      .fn()
      .mockResolvedValue({ ...busyDetail, name: "Facultad de Sistemas e Informatica" });
    const adapters = createAppAdapters({ source: "mock" });
    adapters.organizationalUnits = {
      ...adapters.organizationalUnits,
      getOrganizationalUnit: () => Promise.resolve(busyDetail),
      updateOrganizationalUnit,
    };

    renderWithProviders(<OrganizationalUnitDetailView unitId="fisc" />, { adapters });

    expect(await screen.findByRole("heading", { name: "Facultad de Sistemas" })).toBeVisible();
    expect(screen.getByText("Agenda permanente")).toBeVisible();
    expect(screen.getByText("Licenciatura en Sistemas")).toBeVisible();

    const name = screen.getByRole("textbox", { name: /nombre/i });
    await user.clear(name);
    await user.type(name, "Facultad de Sistemas e Informatica");
    await user.click(screen.getByRole("button", { name: /guardar cambios/i }));

    expect(updateOrganizationalUnit).toHaveBeenCalledWith("fisc", {
      description: null,
      name: "Facultad de Sistemas e Informatica",
    });
  });

  it("explains the default program conflict and allows retrying", async () => {
    const user = setupUser();
    const deactivateOrganizationalUnit = vi
      .fn()
      .mockRejectedValueOnce(Object.assign(new Error("conflict"), { status: 409 }))
      .mockResolvedValueOnce({ ...busyDetail, isActive: false });
    const adapters = createAppAdapters({ source: "mock" });
    adapters.organizationalUnits = {
      ...adapters.organizationalUnits,
      deactivateOrganizationalUnit,
      getOrganizationalUnit: () => Promise.resolve(busyDetail),
    };

    renderWithProviders(<OrganizationalUnitDetailView unitId="fisc" />, { adapters });

    await user.click(await screen.findByRole("button", { name: /desactivar unidad/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /actividades programadas o en curso/i,
    );

    await user.click(screen.getByRole("button", { name: /reintentar/i }));

    expect(deactivateOrganizationalUnit).toHaveBeenCalledTimes(2);
  });

  it("shows a not found panel for a missing unit", async () => {
    const adapters = createAppAdapters({ source: "mock" });
    adapters.organizationalUnits = {
      ...adapters.organizationalUnits,
      getOrganizationalUnit: () =>
        Promise.reject(Object.assign(new Error("missing"), { status: 404 })),
    };

    renderWithProviders(<OrganizationalUnitDetailView unitId="missing" />, { adapters });

    expect(await screen.findByRole("heading", { name: /unidad no encontrada/i })).toBeVisible();
    expect(screen.getByRole("link", { name: /volver al listado de unidades/i })).toHaveAttribute(
      "href",
      "/admin/unidades",
    );
  });
});
