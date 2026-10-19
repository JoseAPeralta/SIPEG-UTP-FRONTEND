import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createAppAdapters, type AppAdapters } from "@/app/adapters";
import { useSessionStore } from "@/store/session";
import { useWorkingContextStore } from "@/store/workingContext";
import {
  createAuthenticatedUser,
  createAuthTokens,
  createEffectiveCollaborator,
  createEventProgram as createEventProgramFixture,
  createEventProgramListItem,
  createOrganizationalUnit,
} from "@/test/factories";
import { renderWithProviders } from "@/test/render";
import { setupUser } from "@/test/user";

import { EventProgramsView } from "./EventProgramsView";

function page(
  items: ReturnType<typeof createEventProgramListItem>[],
  overrides: Partial<{ limit: number; page: number; total: number; totalPages: number }> = {},
) {
  return { items, limit: 20, page: 1, total: items.length, totalPages: 1, ...overrides };
}

function renderView(configure?: (adapters: AppAdapters) => void) {
  useSessionStore.setState({
    currentUser: createAuthenticatedUser({ globalRole: "ADMIN", id: "admin-1" }),
    tokens: createAuthTokens(),
  });
  const adapters = createAppAdapters({ source: "mock" });
  configure?.(adapters);

  return { adapters, ...renderWithProviders(<EventProgramsView />, { adapters }) };
}

afterEach(() => {
  useSessionStore.getState().clearSession();
  useWorkingContextStore.getState().clearWorkingContext();
});

describe("EventProgramsView", () => {
  it("lists every state with its localized status, unit and dates", async () => {
    renderView();

    expect(await screen.findByRole("heading", { level: 1, name: "Programas" })).toBeVisible();
    expect(await screen.findByText("Taller de Gobernanza de Datos Abiertos")).toBeVisible();
    expect(screen.getByText("Competencia de Robotica 2024")).toBeVisible();
    // El filtro aporta una opcion por estado y cada programa su insignia: hay un borrador y un archivado.
    expect(screen.getAllByText("Borrador")).toHaveLength(2);
    expect(screen.getAllByText("Archivado")).toHaveLength(2);
    expect(screen.getAllByText("Agenda permanente")).toHaveLength(4);
    expect(
      screen.getAllByText("Facultad de Ingenieria de Sistemas Computacionales").length,
    ).toBeGreaterThan(0);
  });

  it("sends the trimmed search term on submit and returns to the first page", async () => {
    const loadEventProgramsPage = vi
      .fn()
      .mockResolvedValue(page([createEventProgramListItem()], { total: 40, totalPages: 2 }));
    renderView((adapters) => {
      adapters.eventPrograms = { ...adapters.eventPrograms, loadEventProgramsPage };
    });
    await screen.findByRole("heading", { level: 1, name: "Programas" });
    const user = setupUser();

    await user.type(screen.getByRole("textbox", { name: "Buscar programas" }), "  robotica  ");
    await user.click(screen.getByRole("button", { name: "Buscar" }));

    await waitFor(() =>
      expect(loadEventProgramsPage).toHaveBeenLastCalledWith({ q: "robotica", status: "ALL" }, 1),
    );
  });

  it("sends the status and unit filters and resets the page", async () => {
    const loadEventProgramsPage = vi
      .fn()
      .mockImplementation((_filters: unknown, currentPage: number) =>
        Promise.resolve(
          page([createEventProgramListItem()], { page: currentPage, total: 40, totalPages: 2 }),
        ),
      );
    renderView((adapters) => {
      adapters.eventPrograms = { ...adapters.eventPrograms, loadEventProgramsPage };
    });
    await screen.findByText("Semana de Innovacion Academica");
    const user = setupUser();

    await user.click(screen.getByRole("button", { name: "Siguiente" }));
    await waitFor(() =>
      expect(loadEventProgramsPage).toHaveBeenLastCalledWith({ status: "ALL" }, 2),
    );

    await user.selectOptions(screen.getByRole("combobox", { name: "Estado" }), "DRAFT");
    await waitFor(() =>
      expect(loadEventProgramsPage).toHaveBeenLastCalledWith({ status: "DRAFT" }, 1),
    );

    await user.selectOptions(
      screen.getByRole("combobox", { name: "Unidad" }),
      await screen.findByRole("option", { name: "Facultad de Ingenieria Civil" }),
    );
    await waitFor(() =>
      expect(loadEventProgramsPage).toHaveBeenLastCalledWith(
        { organizationalUnitId: "fic", status: "DRAFT" },
        1,
      ),
    );
  });

  it("clears the search and filters", async () => {
    const loadEventProgramsPage = vi
      .fn()
      .mockImplementation((request: { q?: string }) =>
        Promise.resolve(
          page([
            createEventProgramListItem(
              request.q
                ? { id: "search-result", name: "Resultado de la busqueda" }
                : { id: "all-programs", name: "Programa sin filtros" },
            ),
          ]),
        ),
      );
    renderView((adapters) => {
      adapters.eventPrograms = { ...adapters.eventPrograms, loadEventProgramsPage };
    });
    expect(await screen.findByText("Programa sin filtros")).toBeVisible();
    const user = setupUser();

    await user.type(screen.getByRole("textbox", { name: "Buscar programas" }), "robotica");
    await user.click(screen.getByRole("button", { name: "Buscar" }));
    expect(await screen.findByText("Resultado de la busqueda")).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Limpiar filtros" }));

    expect(await screen.findByText("Programa sin filtros")).toBeVisible();
    expect(screen.getByRole("textbox", { name: "Buscar programas" })).toHaveValue("");
    expect(screen.getByRole("combobox", { name: "Estado" })).toHaveValue("ALL");
    expect(loadEventProgramsPage).toHaveBeenCalledWith({ status: "ALL" }, 1);
    expect(loadEventProgramsPage).toHaveBeenCalledWith({ q: "robotica", status: "ALL" }, 1);
  });

  it("explains an empty result without hiding the filters", async () => {
    const loadEventProgramsPage = vi.fn().mockResolvedValue(page([]));
    renderView((adapters) => {
      adapters.eventPrograms = { ...adapters.eventPrograms, loadEventProgramsPage };
    });
    await screen.findByRole("heading", { level: 1, name: "Programas" });
    const user = setupUser();

    await user.type(screen.getByRole("textbox", { name: "Buscar programas" }), "inexistente");
    await user.click(screen.getByRole("button", { name: "Buscar" }));

    expect(await screen.findByText("No hay programas que coincidan con los filtros")).toBeVisible();
    expect(screen.getByRole("textbox", { name: "Buscar programas" })).toBeVisible();
  });

  it("offers a retry when the list fails", async () => {
    const loadEventProgramsPage = vi
      .fn()
      .mockRejectedValueOnce(new Error("service unavailable"))
      .mockResolvedValueOnce(page([createEventProgramListItem()]));
    renderView((adapters) => {
      adapters.eventPrograms = { ...adapters.eventPrograms, loadEventProgramsPage };
    });

    expect(await screen.findByText(/no se pudo cargar la informacion/i)).toBeVisible();
    const user = setupUser();

    await user.click(screen.getByRole("button", { name: "Reintentar" }));

    await waitFor(() => expect(loadEventProgramsPage).toHaveBeenCalledTimes(2));
    expect(await screen.findByText("Semana de Innovacion Academica")).toBeVisible();
  });

  it("keeps the list visible and offers recovery when the unit catalog fails", async () => {
    renderView((adapters) => {
      adapters.organizationalUnits = {
        ...adapters.organizationalUnits,
        loadOrganizationalUnits: vi.fn().mockRejectedValue(new Error("units unavailable")),
      };
    });

    expect(await screen.findByText("Taller de Gobernanza de Datos Abiertos")).toBeVisible();
    expect(screen.getByText("No fue posible cargar las unidades para filtrar.")).toBeVisible();
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeVisible();
  });

  it("does not gather programs while the session is not an administrator", async () => {
    useSessionStore.setState({
      currentUser: createAuthenticatedUser({ globalRole: "USER" }),
      tokens: createAuthTokens(),
    });
    const adapters = createAppAdapters({ source: "mock" });
    const loadEventProgramsPage = vi.fn();
    adapters.eventPrograms = { ...adapters.eventPrograms, loadEventProgramsPage };
    renderWithProviders(<EventProgramsView />, { adapters });

    expect(await screen.findByText("No hay programas que coincidan con los filtros")).toBeVisible();
    expect(loadEventProgramsPage).not.toHaveBeenCalled();
    expect(screen.getByRole("textbox", { name: "Buscar programas" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Nuevo programa" })).toBeNull();
  });

  it("creates a draft program from the administrative action", async () => {
    const createEventProgram = vi
      .fn()
      .mockResolvedValue(createEventProgramFixture({ name: "Cierre de Ano Academico" }));
    renderView((adapters) => {
      adapters.eventPrograms = { ...adapters.eventPrograms, createEventProgram };
    });
    await screen.findByRole("heading", { level: 1, name: "Programas" });
    const user = setupUser();

    await user.click(screen.getByRole("button", { name: "Nuevo programa" }));
    const form = screen.getByRole("form", { name: "Nuevo programa" });
    await user.type(
      within(form).getByRole("textbox", { name: "Nombre" }),
      "Cierre de Ano Academico",
    );
    await user.selectOptions(
      within(form).getByRole("combobox", { name: "Unidad" }),
      await within(form).findByRole("option", { name: "Facultad de Ingenieria Civil" }),
    );
    fireEvent.change(within(form).getByLabelText("Fecha inicial"), {
      target: { value: "2026-12-18" },
    });
    fireEvent.change(within(form).getByLabelText("Fecha final"), {
      target: { value: "2026-12-20" },
    });
    await user.click(within(form).getByRole("button", { name: "Crear programa" }));

    await waitFor(() =>
      expect(createEventProgram).toHaveBeenCalledWith({
        description: null,
        endDate: "2026-12-20",
        label: null,
        name: "Cierre de Ano Academico",
        organizationalUnitId: "fic",
        startDate: "2026-12-18",
      }),
    );
    expect(await screen.findByRole("status")).toHaveTextContent(/creó como borrador/i);
    expect(screen.queryByRole("button", { name: "Crear programa" })).toBeNull();
    expect(screen.getByRole("button", { name: "Nuevo programa" })).toHaveFocus();
  });

  it("keeps the form data, explains a rejection and refreshes the unit catalog", async () => {
    const loadUnits = vi
      .fn()
      .mockResolvedValue([
        createOrganizationalUnit({ id: "fic", name: "Facultad de Ingenieria Civil" }),
      ]);
    const createEventProgram = vi
      .fn()
      .mockRejectedValueOnce(Object.assign(new Error("backend private detail"), { status: 400 }))
      .mockResolvedValueOnce(createEventProgramFixture());
    renderView((adapters) => {
      adapters.eventPrograms = { ...adapters.eventPrograms, createEventProgram };
      adapters.organizationalUnits = {
        ...adapters.organizationalUnits,
        loadOrganizationalUnits: loadUnits,
      };
    });
    await screen.findByRole("heading", { level: 1, name: "Programas" });
    const user = setupUser();

    await user.click(screen.getByRole("button", { name: "Nuevo programa" }));
    const form = screen.getByRole("form", { name: "Nuevo programa" });
    await user.type(within(form).getByRole("textbox", { name: "Nombre" }), "Cierre de Ano");
    await user.selectOptions(within(form).getByRole("combobox", { name: "Unidad" }), "fic");
    fireEvent.change(within(form).getByLabelText("Fecha inicial"), {
      target: { value: "2026-12-18" },
    });
    fireEvent.change(within(form).getByLabelText("Fecha final"), {
      target: { value: "2026-12-20" },
    });
    const callsBefore = loadUnits.mock.calls.length;
    await user.click(within(form).getByRole("button", { name: "Crear programa" }));

    expect(await screen.findByText(/revise las fechas/i)).toBeVisible();
    expect(screen.queryByText("backend private detail")).toBeNull();
    expect(within(form).getByRole("textbox", { name: "Nombre" })).toHaveValue("Cierre de Ano");
    expect(within(form).getByRole("combobox", { name: "Unidad" })).toHaveValue("fic");
    await waitFor(() => expect(loadUnits.mock.calls.length).toBeGreaterThan(callsBefore));

    await user.click(within(form).getByRole("button", { name: "Crear programa" }));
    expect(await screen.findByRole("status")).toHaveTextContent(/creó como borrador/i);
  });

  it("returns the focus to the opening button when the creation is cancelled", async () => {
    renderView();
    await screen.findByRole("heading", { level: 1, name: "Programas" });
    const user = setupUser();

    await user.click(screen.getByRole("button", { name: "Nuevo programa" }));
    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(screen.queryByRole("button", { name: "Crear programa" })).toBeNull();
    expect(screen.getByRole("button", { name: "Nuevo programa" })).toHaveFocus();
  });

  function singleProgram(
    program: ReturnType<typeof createEventProgramListItem>,
    configure?: (adapters: AppAdapters) => void,
  ) {
    const loadEventProgramsPage = vi.fn().mockResolvedValue(page([program]));

    return renderView((adapters) => {
      adapters.eventPrograms = { ...adapters.eventPrograms, loadEventProgramsPage };
      configure?.(adapters);
    });
  }

  it("edits an additional program and focuses the refreshed list", async () => {
    const updateEventProgram = vi.fn().mockResolvedValue(createEventProgramFixture());
    singleProgram(
      createEventProgramListItem({ id: "program-draft", name: "Taller de Datos", status: "DRAFT" }),
      (adapters) => {
        adapters.eventPrograms = { ...adapters.eventPrograms, updateEventProgram };
      },
    );
    expect(await screen.findByText("Taller de Datos")).toBeVisible();
    const user = setupUser();

    await user.click(screen.getByRole("button", { name: "Editar" }));
    const form = screen.getByRole("form", { name: "Editar programa" });
    await user.clear(within(form).getByRole("textbox", { name: "Nombre" }));
    await user.type(
      within(form).getByRole("textbox", { name: "Nombre" }),
      "Taller de Datos Abiertos",
    );
    await user.click(within(form).getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() =>
      expect(updateEventProgram).toHaveBeenCalledWith("program-draft", {
        description: null,
        endDate: "2026-06-19",
        label: "Semana de innovacion",
        name: "Taller de Datos Abiertos",
        startDate: "2026-06-15",
      }),
    );
    expect(await screen.findByText(/se guardaron/i)).toBeVisible();
    expect(screen.queryByRole("form", { name: "Editar programa" })).toBeNull();
    await waitFor(() =>
      expect(screen.getByRole("group", { name: "Listado de programas" })).toHaveFocus(),
    );
  });

  it("keeps the edited data and explains a rejection without the backend message", async () => {
    const updateEventProgram = vi
      .fn()
      .mockRejectedValue(Object.assign(new Error("backend private detail"), { status: 409 }));
    singleProgram(
      createEventProgramListItem({ id: "program-draft", name: "Taller de Datos", status: "DRAFT" }),
      (adapters) => {
        adapters.eventPrograms = { ...adapters.eventPrograms, updateEventProgram };
      },
    );
    expect(await screen.findByText("Taller de Datos")).toBeVisible();
    const user = setupUser();

    await user.click(screen.getByRole("button", { name: "Editar" }));
    const form = screen.getByRole("form", { name: "Editar programa" });
    await user.clear(within(form).getByRole("textbox", { name: "Nombre" }));
    await user.type(within(form).getByRole("textbox", { name: "Nombre" }), "Taller Nuevo");
    await user.click(within(form).getByRole("button", { name: "Guardar cambios" }));

    expect(await screen.findByText(/actividades existentes fuera del rango/i)).toBeVisible();
    expect(screen.queryByText("backend private detail")).toBeNull();
    expect(within(form).getByRole("textbox", { name: "Nombre" })).toHaveValue("Taller Nuevo");
  });

  it("refreshes the list after an edit conflict without repeating the mutation", async () => {
    const updateEventProgram = vi
      .fn()
      .mockRejectedValue(Object.assign(new Error("backend private detail"), { status: 409 }));
    const loadEventProgramsPage = vi
      .fn()
      .mockResolvedValueOnce(
        page([
          createEventProgramListItem({
            id: "program-draft",
            name: "Taller de Datos",
            status: "DRAFT",
          }),
        ]),
      )
      .mockResolvedValueOnce(
        page([
          createEventProgramListItem({
            id: "program-draft",
            name: "Taller de Datos",
            status: "ARCHIVED",
          }),
        ]),
      );
    renderView((adapters) => {
      adapters.eventPrograms = {
        ...adapters.eventPrograms,
        loadEventProgramsPage,
        updateEventProgram,
      };
    });
    expect(await screen.findByText("Taller de Datos")).toBeVisible();
    const user = setupUser();

    await user.click(screen.getByRole("button", { name: "Editar" }));
    const form = screen.getByRole("form", { name: "Editar programa" });
    await user.clear(within(form).getByRole("textbox", { name: "Nombre" }));
    await user.type(within(form).getByRole("textbox", { name: "Nombre" }), "Taller Nuevo");
    await user.click(within(form).getByRole("button", { name: "Guardar cambios" }));

    expect(await screen.findByText(/pudo ser archivado/i)).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Actualizar listado" }));

    await waitFor(() => expect(loadEventProgramsPage).toHaveBeenCalledTimes(2));
    expect(updateEventProgram).toHaveBeenCalledTimes(1);
    const card = await screen.findByRole("article", { name: "Taller de Datos" });
    expect(within(card).getByRole("button", { name: "Reactivar" })).toBeVisible();
    expect(within(card).queryByRole("button", { name: "Editar" })).toBeNull();
    expect(within(form).getByRole("textbox", { name: "Nombre" })).toHaveValue("Taller Nuevo");
  });

  it("offers only reactivation for an archived additional program", async () => {
    singleProgram(
      createEventProgramListItem({
        id: "program-archived",
        name: "Competencia de Robotica 2024",
        status: "ARCHIVED",
      }),
    );
    expect(await screen.findByText("Competencia de Robotica 2024")).toBeVisible();

    expect(screen.getByRole("button", { name: "Reactivar" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Editar" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Archivar" })).toBeNull();
  });

  it("publishes a draft with the only contractual transition", async () => {
    const updateEventProgram = vi
      .fn()
      .mockResolvedValue(createEventProgramFixture({ status: "ACTIVE" }));
    singleProgram(
      createEventProgramListItem({ id: "program-draft", name: "Taller de Datos", status: "DRAFT" }),
      (adapters) => {
        adapters.eventPrograms = { ...adapters.eventPrograms, updateEventProgram };
      },
    );
    expect(await screen.findByText("Taller de Datos")).toBeVisible();
    const user = setupUser();

    await user.click(screen.getByRole("button", { name: "Publicar" }));
    const confirmation = screen.getByRole("group", {
      name: /confirmar publicación de taller de datos/i,
    });
    await user.click(within(confirmation).getByRole("button", { name: "Confirmar publicación" }));

    await waitFor(() =>
      expect(updateEventProgram).toHaveBeenCalledWith("program-draft", { status: "ACTIVE" }),
    );
    expect(await screen.findByText(/quedó activo/i)).toBeVisible();
    expect(screen.queryByRole("group", { name: /confirmar publicación/i })).toBeNull();
  });

  it("explains an archive conflict and keeps the confirmation open", async () => {
    const archiveEventProgram = vi
      .fn()
      .mockRejectedValue(Object.assign(new Error("backend private detail"), { status: 409 }));
    singleProgram(
      createEventProgramListItem({ id: "program-active", name: "Semana de Innovacion" }),
      (adapters) => {
        adapters.eventPrograms = { ...adapters.eventPrograms, archiveEventProgram };
      },
    );
    expect(await screen.findByText("Semana de Innovacion")).toBeVisible();
    const user = setupUser();

    await user.click(screen.getByRole("button", { name: "Archivar" }));
    const confirmation = screen.getByRole("group", {
      name: /confirmar archivo de semana de innovacion/i,
    });
    await user.click(within(confirmation).getByRole("button", { name: "Confirmar archivo" }));

    expect(await screen.findByText(/actividades programadas o en curso/i)).toBeVisible();
    expect(screen.queryByText("backend private detail")).toBeNull();
    expect(within(confirmation).getByRole("button", { name: "Confirmar archivo" })).toBeVisible();
  });

  it("reactivates an archived additional program", async () => {
    const reactivateEventProgram = vi
      .fn()
      .mockResolvedValue(createEventProgramFixture({ status: "ACTIVE" }));
    singleProgram(
      createEventProgramListItem({
        id: "program-archived",
        name: "Competencia de Robotica 2024",
        status: "ARCHIVED",
      }),
      (adapters) => {
        adapters.eventPrograms = { ...adapters.eventPrograms, reactivateEventProgram };
      },
    );
    expect(await screen.findByText("Competencia de Robotica 2024")).toBeVisible();
    const user = setupUser();

    await user.click(screen.getByRole("button", { name: "Reactivar" }));
    const confirmation = screen.getByRole("group", {
      name: /confirmar reactivación de competencia de robotica 2024/i,
    });
    await user.click(within(confirmation).getByRole("button", { name: "Confirmar reactivación" }));

    await waitFor(() => expect(reactivateEventProgram).toHaveBeenCalledWith("program-archived"));
    expect(await screen.findByText(/se reactivó/i)).toBeVisible();
  });

  it("presents the permanent agenda without dates or incompatible controls", async () => {
    singleProgram(
      createEventProgramListItem({
        endDate: null,
        id: "program-fic-default",
        isDefault: true,
        name: "Programa de Eventos de Ingenieria Civil",
        organizationalUnit: {
          id: "fic",
          name: "Facultad de Ingenieria Civil",
          type: "FACULTY",
        },
        startDate: null,
      }),
    );
    expect(await screen.findByText("Programa de Eventos de Ingenieria Civil")).toBeVisible();

    expect(screen.getByText("Agenda permanente")).toBeVisible();
    expect(screen.queryByRole("button", { name: "Archivar" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Reactivar" })).toBeNull();
    expect(screen.getByText(/su ciclo de vida lo controla la unidad/i)).toBeVisible();
    expect(screen.getByRole("link", { name: "Gestionar unidad" })).toHaveAttribute(
      "href",
      "/admin/unidades/fic",
    );

    const user = setupUser();
    await user.click(screen.getByRole("button", { name: "Editar" }));

    expect(screen.getByRole("form", { name: "Editar programa" })).toBeVisible();
    expect(screen.queryByLabelText("Fecha inicial")).toBeNull();
    expect(screen.queryByLabelText("Fecha final")).toBeNull();
  });

  it("explains an archived permanent agenda without lifecycle controls", async () => {
    singleProgram(
      createEventProgramListItem({
        endDate: null,
        id: "program-fic-default",
        isDefault: true,
        name: "Programa de Eventos de Ingenieria Civil",
        organizationalUnit: {
          id: "fic",
          name: "Facultad de Ingenieria Civil",
          type: "FACULTY",
        },
        startDate: null,
        status: "ARCHIVED",
      }),
    );
    expect(await screen.findByText("Programa de Eventos de Ingenieria Civil")).toBeVisible();

    expect(screen.getByText(/está archivada porque su unidad está inactiva/i)).toBeVisible();
    expect(screen.getByRole("link", { name: "Gestionar unidad" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Editar" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Reactivar" })).toBeNull();
  });

  it("returns the focus to the opening control when a panel is cancelled", async () => {
    singleProgram(
      createEventProgramListItem({ id: "program-active", name: "Semana de Innovacion" }),
    );
    expect(await screen.findByText("Semana de Innovacion")).toBeVisible();
    const user = setupUser();

    await user.click(screen.getByRole("button", { name: "Editar" }));
    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(screen.queryByRole("form", { name: "Editar programa" })).toBeNull();
    expect(screen.getByRole("button", { name: "Editar" })).toHaveFocus();
  });

  it("opens the collaborators panel scoped to the chosen program and returns the focus on close", async () => {
    const loadCollaborators = vi.fn().mockResolvedValue([]);
    renderView((adapters) => {
      adapters.collaborators = { ...adapters.collaborators, loadCollaborators };
    });
    const card = await screen.findByRole("article", { name: "Semana de Innovacion Academica" });
    const user = setupUser();

    await user.click(within(card).getByRole("button", { name: "Colaboradores" }));

    expect(
      await screen.findByRole("heading", {
        level: 2,
        name: "Colaboradores de Semana de Innovacion Academica",
      }),
    ).toBeVisible();
    expect(screen.getByText("Estado del programa: Activo")).toBeVisible();
    await waitFor(() =>
      expect(loadCollaborators).toHaveBeenCalledWith({
        type: "program",
        id: "program-innovation-week",
      }),
    );

    await user.click(screen.getByRole("button", { name: "Cerrar colaboradores" }));

    expect(screen.queryByRole("heading", { level: 2, name: /colaboradores de/i })).toBeNull();
    await waitFor(() =>
      expect(within(card).getByRole("button", { name: "Colaboradores" })).toHaveFocus(),
    );
  });

  it("keeps an archived program consultable in read-only mode", async () => {
    singleProgram(
      createEventProgramListItem({
        id: "program-robotics-competition-2024",
        name: "Competencia de Robotica 2024",
        status: "ARCHIVED",
      }),
    );
    const card = await screen.findByRole("article", { name: "Competencia de Robotica 2024" });
    const user = setupUser();

    await user.click(within(card).getByRole("button", { name: "Colaboradores" }));

    expect(
      await screen.findByText(
        "El programa está archivado. Puede consultar sus colaboradores, pero no modificarlos.",
      ),
    ).toBeVisible();
    expect(screen.getByText("Estado del programa: Archivado")).toBeVisible();
    expect(screen.queryByRole("button", { name: "Agregar colaborador" })).toBeNull();
    expect(screen.queryByLabelText("Buscar persona")).toBeNull();
  });

  it("moves between programs and panels without carrying state", async () => {
    renderView();
    const first = await screen.findByRole("article", { name: "Semana de Innovacion Academica" });
    const user = setupUser();

    await user.click(within(first).getByRole("button", { name: "Colaboradores" }));
    await screen.findByRole("heading", {
      level: 2,
      name: "Colaboradores de Semana de Innovacion Academica",
    });

    const second = screen.getByRole("article", { name: "Cumbre de Energia y Redes Inteligentes" });
    await user.click(within(second).getByRole("button", { name: "Colaboradores" }));

    expect(
      await screen.findByRole("heading", {
        level: 2,
        name: "Colaboradores de Cumbre de Energia y Redes Inteligentes",
      }),
    ).toBeVisible();
    expect(screen.queryByRole("heading", { level: 2, name: /semana de innovacion/i })).toBeNull();

    await user.click(within(second).getByRole("button", { name: "Editar" }));

    expect(screen.queryByRole("heading", { level: 2, name: /colaboradores de/i })).toBeNull();
    expect(screen.getByRole("form", { name: "Editar programa" })).toBeVisible();
  });

  it("refreshes the program list when recovering from a collaborator conflict", async () => {
    const loadCollaborators = vi.fn().mockResolvedValue([createEffectiveCollaborator()]);
    const removeCollaborator = vi
      .fn()
      .mockRejectedValue(Object.assign(new Error("backend private detail"), { status: 409 }));
    const loadEventProgramsPage = vi
      .fn()
      .mockResolvedValue(
        page([createEventProgramListItem({ id: "program-active", name: "Semana de Innovacion" })]),
      );
    renderView((adapters) => {
      adapters.collaborators = {
        ...adapters.collaborators,
        loadCollaborators,
        removeCollaborator,
      };
      adapters.eventPrograms = { ...adapters.eventPrograms, loadEventProgramsPage };
    });
    const card = await screen.findByRole("article", { name: "Semana de Innovacion" });
    const user = setupUser();

    await user.click(within(card).getByRole("button", { name: "Colaboradores" }));
    await user.click(await screen.findByRole("button", { name: "Retirar a Ana Pérez" }));
    await user.click(screen.getByRole("button", { name: "Confirmar retirada de Ana Pérez" }));

    expect(await screen.findByText(/No se pudo retirar la colaboración/)).toBeVisible();
    expect(screen.queryByText("backend private detail")).toBeNull();
    const callsBefore = loadEventProgramsPage.mock.calls.length;

    await user.click(screen.getByRole("button", { name: "Actualizar colaboradores" }));

    await waitFor(() =>
      expect(loadEventProgramsPage.mock.calls.length).toBeGreaterThan(callsBefore),
    );
  });

  it("selects a readable program as the administrative working context", async () => {
    renderView();
    const card = await screen.findByRole("article", {
      name: "Cumbre de Energia y Redes Inteligentes",
    });
    const user = setupUser();

    await user.click(within(card).getByRole("button", { name: "Usar como contexto" }));

    expect(useWorkingContextStore.getState().workingContext).toEqual({
      id: "program-energy-transition-summit",
      kind: "eventProgram",
    });
    expect(within(card).getByText("Contexto seleccionado")).toBeVisible();
    expect(within(card).getByRole("button", { name: "Usar como contexto" })).toBeDisabled();
  });

  it("selects an archived program that remains readable", async () => {
    renderView();
    const card = await screen.findByRole("article", { name: "Competencia de Robotica 2024" });
    const user = setupUser();

    await user.click(within(card).getByRole("button", { name: "Usar como contexto" }));

    expect(useWorkingContextStore.getState().workingContext).toEqual({
      id: "program-robotics-competition-2024",
      kind: "eventProgram",
    });
    expect(within(card).getByRole("button", { name: "Usar como contexto" })).toBeDisabled();
  });
});
