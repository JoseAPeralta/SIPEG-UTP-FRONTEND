import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createAppAdapters, type AppAdapters } from "@/app/adapters";
import { useSessionStore } from "@/store/session";
import type { EventProgram } from "@/types/domain";
import {
  createAuthenticatedUser,
  createAuthTokens,
  createEventProgram as createEventProgramFixture,
  createEventProgramListItem,
} from "@/test/factories";
import { renderWithProviders } from "@/test/render";
import { setupUser } from "@/test/user";

import { EventProgramsView } from "./EventProgramsView";

function page(items: ReturnType<typeof createEventProgramListItem>[]) {
  return { items, limit: 20, page: 1, total: items.length, totalPages: 1 };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });

  return { promise, reject, resolve };
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

afterEach(() => {
  useSessionStore.getState().clearSession();
});

describe("EventProgramsView concurrency", () => {
  it("opens the creation form closing an open edition", async () => {
    singleProgram(
      createEventProgramListItem({ id: "program-draft", name: "Taller de Datos", status: "DRAFT" }),
    );
    expect(await screen.findByText("Taller de Datos")).toBeVisible();
    const user = setupUser();

    await user.click(screen.getByRole("button", { name: "Editar" }));
    expect(screen.getByRole("form", { name: "Editar programa" })).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Nuevo programa" }));

    expect(screen.queryByRole("form", { name: "Editar programa" })).toBeNull();
    expect(screen.getByRole("form", { name: "Nuevo programa" })).toBeVisible();
  });

  it("blocks every panel control while a lifecycle mutation is pending and sends one request", async () => {
    const pending = deferred<EventProgram>();
    const updateEventProgram = vi.fn().mockReturnValue(pending.promise);
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

    await waitFor(() => expect(updateEventProgram).toHaveBeenCalledTimes(1));
    expect(screen.getByRole("button", { name: "Nuevo programa" })).toBeDisabled();
    const card = screen.getByRole("article", { name: "Taller de Datos" });
    expect(within(card).getByRole("button", { name: "Archivar" })).toBeDisabled();
    expect(within(card).getByRole("button", { name: "Editar" })).toBeDisabled();
    expect(within(card).getByRole("button", { name: "Colaboradores" })).toBeDisabled();

    await user.click(within(confirmation).getByRole("button", { name: "Confirmando..." }));
    expect(updateEventProgram).toHaveBeenCalledTimes(1);
    expect(within(confirmation).getByText(/taller de datos/i)).toBeVisible();

    await act(async () => {
      pending.resolve(createEventProgramFixture({ status: "ACTIVE" }));
      await pending.promise;
    });

    expect(await screen.findByText(/quedó activo/i)).toBeVisible();
    expect(screen.queryByRole("group", { name: /confirmar publicación/i })).toBeNull();
  });

  it("exposes the controls again after a rejection and preserves the written data", async () => {
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

    expect(await screen.findByText(/pudo ser archivado/i)).toBeVisible();
    expect(screen.getByRole("button", { name: "Nuevo programa" })).toBeEnabled();
    const card = screen.getByRole("article", { name: "Taller de Datos" });
    expect(within(card).getByRole("button", { name: "Editar" })).toBeEnabled();
    expect(within(form).getByRole("textbox", { name: "Nombre" })).toHaveValue("Taller Nuevo");
  });

  it("does not switch panels while a creation is pending", async () => {
    const pending = deferred<EventProgram>();
    const createEventProgram = vi.fn().mockReturnValue(pending.promise);
    renderView((adapters) => {
      adapters.eventPrograms = { ...adapters.eventPrograms, createEventProgram };
    });
    await screen.findByRole("heading", { level: 1, name: "Programas" });
    const user = setupUser();

    await user.click(screen.getByRole("button", { name: "Nuevo programa" }));
    const form = screen.getByRole("form", { name: "Nuevo programa" });
    await user.type(within(form).getByRole("textbox", { name: "Nombre" }), "Cierre de Ano");
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

    await waitFor(() => expect(createEventProgram).toHaveBeenCalledTimes(1));
    expect(screen.getByRole("button", { name: "Nuevo programa" })).toBeDisabled();
    const card = await screen.findByRole("article", { name: "Semana de Innovacion Academica" });
    expect(within(card).getByRole("button", { name: "Editar" })).toBeDisabled();
    expect(within(card).getByRole("button", { name: "Colaboradores" })).toBeDisabled();

    await act(async () => {
      pending.resolve(createEventProgramFixture({ name: "Cierre de Ano" }));
      await pending.promise;
    });

    expect(await screen.findByRole("status")).toHaveTextContent(/creó como borrador/i);
    expect(screen.queryByRole("form", { name: "Nuevo programa" })).toBeNull();
  });
});
