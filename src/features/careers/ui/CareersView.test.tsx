import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { createAppAdapters } from "@/app/adapters";
import type { AppAdapters } from "@/app/adapters";
import { createCareer, createOrganizationalUnit } from "@/test/factories";
import { renderWithProviders } from "@/test/render";
import { useSessionStore } from "@/store/session";

import { CareersView } from "./CareersView";

function renderCareersView(configure?: (adapters: AppAdapters) => void) {
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
  const adapters = createAppAdapters({ source: "mock" });
  adapters.careers.loadCareers = () =>
    Promise.resolve([
      createCareer({ code: "SIST", name: "Sistemas" }),
      createCareer({ code: "OTROS", id: "otros", name: "Otros", unitId: null }),
    ]);
  adapters.organizationalUnits.loadOrganizationalUnits = () =>
    Promise.resolve([createOrganizationalUnit({ id: "fisc", name: "Facultad de Sistemas" })]);
  configure?.(adapters);

  return { adapters, ...renderWithProviders(<CareersView />, { adapters }) };
}

describe("CareersView", () => {
  it("lists institutional and global careers while keeping OTROS protected", async () => {
    renderCareersView();

    expect(await screen.findByRole("heading", { name: "Carreras" })).toBeVisible();
    expect(await screen.findByText("Sistemas")).toBeVisible();
    expect(screen.getByText("Global")).toBeVisible();
    expect(screen.getByRole("button", { name: "Editar Otros" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Eliminar Otros" })).toBeDisabled();
  });

  it("creates a faculty career from the administrative form", async () => {
    const user = userEvent.setup();
    const create = vi
      .fn()
      .mockResolvedValue(createCareer({ code: "DATA", name: "Ciencia de Datos" }));
    renderCareersView((adapters) => {
      adapters.careers.createCareer = create;
    });

    await user.click(await screen.findByRole("button", { name: "Nueva carrera" }));
    await user.type(screen.getByRole("textbox", { name: "Nombre" }), "Ciencia de Datos");
    await user.type(screen.getByRole("textbox", { name: "Código" }), "DATA");
    await user.selectOptions(screen.getByRole("combobox", { name: "Unidad" }), "fisc");
    await user.click(screen.getByRole("button", { name: "Guardar carrera" }));

    expect(create).toHaveBeenCalledWith({
      code: "DATA",
      description: null,
      name: "Ciencia de Datos",
      unitId: "fisc",
    });
  });

  it("explains a rejected faculty instead of rendering the backend error", async () => {
    const user = userEvent.setup();
    renderCareersView((adapters) => {
      adapters.careers.createCareer = vi
        .fn()
        .mockRejectedValue(Object.assign(new Error("backend private detail"), { status: 400 }));
    });

    await user.click(await screen.findByRole("button", { name: "Nueva carrera" }));
    await user.type(screen.getByRole("textbox", { name: "Nombre" }), "Ciencia de Datos");
    await user.type(screen.getByRole("textbox", { name: "Código" }), "DATA");
    await user.selectOptions(screen.getByRole("combobox", { name: "Unidad" }), "fisc");
    await user.click(screen.getByRole("button", { name: "Guardar carrera" }));

    expect(await screen.findByText(/unidad seleccionada ya no admite carreras/i)).toBeVisible();
    expect(screen.queryByText("backend private detail")).not.toBeInTheDocument();
  });

  it("explains conflicts without exposing backend messages", async () => {
    const user = userEvent.setup();
    renderCareersView((adapters) => {
      adapters.careers.createCareer = vi
        .fn()
        .mockRejectedValue(Object.assign(new Error("duplicate DATA"), { status: 409 }));
    });

    await user.click(await screen.findByRole("button", { name: "Nueva carrera" }));
    await user.type(screen.getByRole("textbox", { name: "Nombre" }), "Ciencia de Datos");
    await user.type(screen.getByRole("textbox", { name: "Código" }), "DATA");
    await user.click(screen.getByRole("button", { name: "Guardar carrera" }));

    expect(await screen.findByText(/código ya está registrado/i)).toBeVisible();
    expect(screen.queryByText("duplicate DATA")).not.toBeInTheDocument();
  });
});
