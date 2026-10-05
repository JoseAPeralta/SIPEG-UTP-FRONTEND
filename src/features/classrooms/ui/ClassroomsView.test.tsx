import { screen } from "@testing-library/react";
import { setupUser } from "@/test/user";
import { describe, expect, it, vi } from "vitest";

import { createAppAdapters } from "@/app/adapters";
import type { AppAdapters } from "@/app/adapters";
import { useSessionStore } from "@/store/session";
import { createAuthenticatedUser, createClassroom } from "@/test/factories";
import { renderWithProviders } from "@/test/render";

import { ClassroomsView } from "./ClassroomsView";

function renderClassroomsView(configure?: (adapters: AppAdapters) => void) {
  useSessionStore.setState({ currentUser: createAuthenticatedUser({ id: "admin-1" }) });
  const adapters = createAppAdapters({ source: "mock" });
  adapters.classrooms.loadClassrooms = () =>
    Promise.resolve([
      createClassroom({ id: "aula-10", name: "Aula 10B" }),
      createClassroom({ id: "lab-01", name: "Laboratorio de Analitica", type: "LABORATORY" }),
      createClassroom({ id: "aula-old", isActive: false, name: "Aulagivena" }),
    ]);
  configure?.(adapters);

  return { adapters, ...renderWithProviders(<ClassroomsView />, { adapters }) };
}

describe("ClassroomsView", () => {
  it("lists active and inactive classrooms behind the module heading", async () => {
    renderClassroomsView();

    expect(await screen.findByRole("heading", { level: 1, name: "Aulas" })).toBeVisible();
    expect(await screen.findByText("Aula 10B")).toBeVisible();
    expect(screen.getByText("Laboratorio de Analitica")).toBeVisible();
    expect(screen.getByText("Aulagivena")).toBeVisible();
    expect(screen.getByText("Inactiva")).toBeVisible();
  });

  it("asks the adapter for every classroom so inactive ones stay reachable", async () => {
    const loadClassrooms = vi.fn().mockResolvedValue([]);
    renderClassroomsView((adapters) => {
      adapters.classrooms.loadClassrooms = loadClassrooms;
    });

    expect(await screen.findByRole("heading", { level: 1, name: "Aulas" })).toBeVisible();

    await vi.waitFor(() => expect(loadClassrooms).toHaveBeenCalledWith({ isActive: "all" }));
  });

  it("translates the type and status filters into contract filters", async () => {
    const user = setupUser();
    const loadClassrooms = vi.fn().mockResolvedValue([]);
    renderClassroomsView((adapters) => {
      adapters.classrooms.loadClassrooms = loadClassrooms;
    });

    await screen.findByRole("heading", { level: 1, name: "Aulas" });
    await user.selectOptions(screen.getByRole("combobox", { name: "Tipo" }), "LABORATORY");
    await user.selectOptions(screen.getByRole("combobox", { name: "Estado" }), "inactive");
    await user.type(screen.getByRole("spinbutton", { name: "Capacidad minima" }), "30");
    await user.type(screen.getByRole("textbox", { name: "Amenidad" }), "proyector");

    await vi.waitFor(() =>
      expect(loadClassrooms).toHaveBeenCalledWith({
        amenity: "proyector",
        isActive: "inactive",
        minCapacity: 30,
        type: "LABORATORY",
      }),
    );
  });

  it("narrow the visible list with the local search", async () => {
    const user = setupUser();
    renderClassroomsView();

    await user.type(await screen.findByLabelText("Buscar aulas"), "Analitica");

    expect(screen.getByText("Laboratorio de Analitica")).toBeVisible();
    expect(screen.queryByText("Aula 10B")).not.toBeInTheDocument();
  });

  it("announces when no classroom matches", async () => {
    const user = setupUser();
    renderClassroomsView();

    await user.type(await screen.findByLabelText("Buscar aulas"), "inexistente");

    expect(await screen.findByText(/no hay aulas que coincidan/i)).toBeVisible();
  });

  it("creates a classroom sending only the contract fields", async () => {
    const user = setupUser();
    const createClassroom = vi.fn().mockResolvedValue({ availability: [] });
    renderClassroomsView((adapters) => {
      adapters.classrooms.createClassroom = createClassroom;
    });

    await user.click(await screen.findByRole("button", { name: "Nueva aula" }));
    await user.type(screen.getByRole("textbox", { name: "Nombre" }), "Aula 202");
    await user.selectOptions(screen.getByRole("combobox", { name: "Tipo" }), "CLASSROOM");
    await user.type(screen.getByRole("spinbutton", { name: "Capacidad" }), "45");
    await user.type(screen.getByRole("textbox", { name: "Edificio" }), "Aulas");
    await user.type(screen.getByRole("spinbutton", { name: "Piso" }), "2");
    await user.click(screen.getByRole("button", { name: "Guardar aula" }));

    await vi.waitFor(() =>
      expect(createClassroom).toHaveBeenCalledWith({
        building: "Aulas",
        capacity: 45,
        floor: 2,
        name: "Aula 202",
        type: "CLASSROOM",
      }),
    );
  });

  it("explains a rejected creation without exposing the backend message", async () => {
    const user = setupUser();
    renderClassroomsView((adapters) => {
      adapters.classrooms.createClassroom = vi
        .fn()
        .mockRejectedValue(Object.assign(new Error("viola check name_unico"), { status: 400 }));
    });

    await user.click(await screen.findByRole("button", { name: "Nueva aula" }));
    await user.type(screen.getByRole("textbox", { name: "Nombre" }), "Aula 202");
    await user.type(screen.getByRole("spinbutton", { name: "Capacidad" }), "45");
    await user.click(screen.getByRole("button", { name: "Guardar aula" }));

    expect(await screen.findByText(/revise los datos ingresados/i)).toBeVisible();
    expect(screen.queryByText(/viola check name_unico/)).not.toBeInTheDocument();
  });

  it("explains a missing permission instead of a raw failure", async () => {
    const user = setupUser();
    renderClassroomsView((adapters) => {
      adapters.classrooms.createClassroom = vi
        .fn()
        .mockRejectedValue(Object.assign(new Error("forbidden"), { status: 403 }));
    });

    await user.click(await screen.findByRole("button", { name: "Nueva aula" }));
    await user.type(screen.getByRole("textbox", { name: "Nombre" }), "Aula 202");
    await user.type(screen.getByRole("spinbutton", { name: "Capacidad" }), "45");
    await user.click(screen.getByRole("button", { name: "Guardar aula" }));

    expect(await screen.findByText(/no tiene permisos para administrar aulas/i)).toBeVisible();
  });

  it("links every classroom to its own administrative detail route", async () => {
    renderClassroomsView();

    expect(await screen.findByRole("link", { name: "Ver detalle de Aula 10B" })).toHaveAttribute(
      "href",
      "/admin/aulas/aula-10",
    );
  });
});
