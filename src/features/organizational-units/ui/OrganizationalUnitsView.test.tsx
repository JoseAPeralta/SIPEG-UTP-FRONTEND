import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { createAppAdapters } from "@/app/adapters";
import { createOrganizationalUnit } from "@/test/factories";
import { renderWithProviders } from "@/test/render";
import { useSessionStore } from "@/store/session";

import { OrganizationalUnitsView } from "./OrganizationalUnitsView";

function useAdminSession() {
  useSessionStore.setState({
    currentUser: {
      career: null,
      email: "admin@sipeg.test",
      firstName: "Admin",
      globalRole: "ADMIN",
      id: "admin-1",
      identificationNumber: "1",
      lastName: "SIPEG",
      unit: null,
    },
  });
}

describe("OrganizationalUnitsView", () => {
  it("shows administrative units and their lifecycle state", async () => {
    useAdminSession();
    const adapters = createAppAdapters({ source: "mock" });
    adapters.organizationalUnits.loadOrganizationalUnits = () =>
      Promise.resolve([
        createOrganizationalUnit({ isActive: true, name: "Facultad de Sistemas" }),
        createOrganizationalUnit({
          id: "unit-2",
          isActive: false,
          name: "Subdireccion Academica",
        }),
      ]);

    renderWithProviders(<OrganizationalUnitsView />, { adapters });

    expect(await screen.findByRole("heading", { name: "Unidades organizativas" })).toBeVisible();
    expect(await screen.findByText("Facultad de Sistemas")).toBeVisible();
    expect(screen.getByText("Inactiva")).toBeVisible();
    expect(
      screen.getByRole("link", { name: /ver detalle de facultad de sistemas/i }),
    ).toHaveAttribute("href", "/admin/unidades/fic");
  });

  it("creates a unit and reports a duplicate code", async () => {
    const user = userEvent.setup();
    useAdminSession();
    const adapters = createAppAdapters({ source: "mock" });
    const createOrganizationalUnit = vi
      .fn()
      .mockRejectedValue(Object.assign(new Error("conflict"), { status: 409 }));
    adapters.organizationalUnits = {
      ...adapters.organizationalUnits,
      createOrganizationalUnit,
    };

    renderWithProviders(<OrganizationalUnitsView />, { adapters });

    await user.click(await screen.findByRole("button", { name: /nueva unidad/i }));
    await user.type(screen.getByRole("textbox", { name: /nombre/i }), "Facultad de Datos");
    await user.type(screen.getByRole("textbox", { name: /c[oó]digo/i }), "FID");
    await user.click(screen.getByRole("button", { name: /guardar unidad/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /ya existe una unidad con ese c[oó]digo/i,
    );
    expect(createOrganizationalUnit).toHaveBeenCalledWith({
      code: "FID",
      description: null,
      name: "Facultad de Datos",
      type: "FACULTY",
    });
  });
});
