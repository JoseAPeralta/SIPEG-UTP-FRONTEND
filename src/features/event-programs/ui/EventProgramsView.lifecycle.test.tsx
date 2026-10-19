import { fireEvent, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { createAppAdapters } from "@/app/adapters";
import { useSessionStore } from "@/store/session";
import { createAuthenticatedUser, createAuthTokens } from "@/test/factories";
import { renderWithProviders } from "@/test/render";
import { setupUser } from "@/test/user";

import { EventProgramsView } from "./EventProgramsView";

function renderView() {
  useSessionStore.setState({
    currentUser: createAuthenticatedUser({ globalRole: "ADMIN", id: "admin-1" }),
    tokens: createAuthTokens(),
  });
  const adapters = createAppAdapters({ source: "mock" });

  return renderWithProviders(<EventProgramsView />, { adapters });
}

afterEach(() => {
  useSessionStore.getState().clearSession();
});

describe("EventProgramsView lifecycle", () => {
  it("walks the same program through create, edit, publish, archive and reactivate", async () => {
    renderView();
    expect(await screen.findByRole("heading", { level: 1, name: "Programas" })).toBeVisible();
    expect(await screen.findByText("Semana de Innovacion Academica")).toBeVisible();
    const user = setupUser();

    // Alta: el programa nace como borrador de la unidad activa.
    await user.click(screen.getByRole("button", { name: "Nuevo programa" }));
    const createForm = screen.getByRole("form", { name: "Nuevo programa" });
    await user.type(
      within(createForm).getByRole("textbox", { name: "Nombre" }),
      "Cierre de Ano 2026",
    );
    await user.selectOptions(
      within(createForm).getByRole("combobox", { name: "Unidad" }),
      await within(createForm).findByRole("option", { name: "Facultad de Ingenieria Civil" }),
    );
    fireEvent.change(within(createForm).getByLabelText("Fecha inicial"), {
      target: { value: "2026-12-18" },
    });
    fireEvent.change(within(createForm).getByLabelText("Fecha final"), {
      target: { value: "2026-12-20" },
    });
    await user.click(within(createForm).getByRole("button", { name: "Crear programa" }));

    expect(await screen.findByRole("status")).toHaveTextContent(/creó como borrador/i);
    let card = await screen.findByRole("article", { name: "Cierre de Ano 2026" });
    expect(within(card).getByText("Borrador")).toBeVisible();
    expect(within(card).getByRole("button", { name: "Publicar" })).toBeVisible();

    // Edicion: la misma tarjeta cambia de nombre y conserva su estado.
    await user.click(within(card).getByRole("button", { name: "Editar" }));
    const editForm = screen.getByRole("form", { name: "Editar programa" });
    await user.clear(within(editForm).getByRole("textbox", { name: "Nombre" }));
    await user.type(
      within(editForm).getByRole("textbox", { name: "Nombre" }),
      "Cierre de Ano 2026 Renovado",
    );
    await user.click(within(editForm).getByRole("button", { name: "Guardar cambios" }));

    expect(await screen.findByText(/se guardaron/i)).toBeVisible();
    card = await screen.findByRole("article", { name: "Cierre de Ano 2026 Renovado" });
    expect(within(card).getByText("Borrador")).toBeVisible();

    // Publicacion: unica transicion contractual DRAFT -> ACTIVE.
    await user.click(within(card).getByRole("button", { name: "Publicar" }));
    await user.click(screen.getByRole("button", { name: "Confirmar publicación" }));

    expect(await screen.findByText(/quedó activo/i)).toBeVisible();
    card = await screen.findByRole("article", { name: "Cierre de Ano 2026 Renovado" });
    expect(within(card).getByText("Activo")).toBeVisible();
    expect(within(card).queryByRole("button", { name: "Publicar" })).toBeNull();
    expect(within(card).getByRole("button", { name: "Archivar" })).toBeVisible();

    // Archivo: accion explicita, nunca borrado fisico.
    await user.click(within(card).getByRole("button", { name: "Archivar" }));
    await user.click(screen.getByRole("button", { name: "Confirmar archivo" }));

    expect(await screen.findByText(/se archivó/i)).toBeVisible();
    card = await screen.findByRole("article", { name: "Cierre de Ano 2026 Renovado" });
    expect(within(card).getByText("Archivado")).toBeVisible();
    expect(within(card).queryByRole("button", { name: "Editar" })).toBeNull();
    expect(within(card).getByRole("button", { name: "Reactivar" })).toBeVisible();

    // Reactivacion: vuelve a la agenda con sus fechas.
    await user.click(within(card).getByRole("button", { name: "Reactivar" }));
    await user.click(screen.getByRole("button", { name: "Confirmar reactivación" }));

    expect(await screen.findByText(/se reactivó/i)).toBeVisible();
    card = await screen.findByRole("article", { name: "Cierre de Ano 2026 Renovado" });
    expect(within(card).getByText("Activo")).toBeVisible();
    expect(within(card).getByRole("button", { name: "Editar" })).toBeVisible();
  });

  it("keeps the permanent agenda without archive or reactivation and linked to its unit", async () => {
    renderView();
    expect(await screen.findByRole("heading", { level: 1, name: "Programas" })).toBeVisible();

    const card = await screen.findByRole("article", {
      name: "Programa de Eventos de Ingenieria Civil",
    });

    expect(within(card).getByText("Agenda permanente")).toBeVisible();
    expect(within(card).queryByRole("button", { name: "Archivar" })).toBeNull();
    expect(within(card).queryByRole("button", { name: "Reactivar" })).toBeNull();
    expect(within(card).getByRole("link", { name: "Gestionar unidad" })).toHaveAttribute(
      "href",
      "/admin/unidades/fic",
    );
  });
});
