import { fireEvent, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { createEventProgramListItem } from "@/test/factories";
import { renderWithProviders } from "@/test/render";
import { setupUser } from "@/test/user";

import { EditEventProgramForm } from "./EditEventProgramForm";

function additionalProgram(overrides: Parameters<typeof createEventProgramListItem>[0] = {}) {
  return createEventProgramListItem({
    description: "Serie de actividades sobre datos abiertos.",
    endDate: "2026-06-19",
    id: "program-1",
    isDefault: false,
    label: "Semana de innovacion",
    name: "Semana de Innovacion Academica",
    organizationalUnit: { id: "fisc", name: "Facultad de Ingenieria de Sistemas", type: "FACULTY" },
    startDate: "2026-06-15",
    ...overrides,
  });
}

function renderForm(overrides: Partial<Parameters<typeof EditEventProgramForm>[0]> = {}) {
  const onCancel = vi.fn();
  const onSubmit = vi.fn();
  const props = {
    failure: null,
    isSubmitting: false,
    onCancel,
    onSubmit,
    program: additionalProgram(),
    ...overrides,
  };

  return { onCancel, onSubmit, ...renderWithProviders(<EditEventProgramForm {...props} />) };
}

describe("EditEventProgramForm", () => {
  it("prefills the editable fields and shows the owning unit as read-only", () => {
    renderForm();

    expect(screen.getByRole("textbox", { name: "Nombre" })).toHaveValue(
      "Semana de Innovacion Academica",
    );
    expect(screen.getByRole("textbox", { name: "Etiqueta" })).toHaveValue("Semana de innovacion");
    expect(screen.getByRole("textbox", { name: "Descripción" })).toHaveValue(
      "Serie de actividades sobre datos abiertos.",
    );
    expect(screen.getByLabelText("Fecha inicial")).toHaveValue("2026-06-15");
    expect(screen.getByLabelText("Fecha final")).toHaveValue("2026-06-19");
    expect(screen.getByLabelText("Unidad")).toHaveValue("Facultad de Ingenieria de Sistemas");
    expect(screen.getByLabelText("Unidad")).toBeDisabled();
  });

  it("submits the trimmed allowlisted request", async () => {
    const { onSubmit } = renderForm();
    const user = setupUser();

    fireEvent.change(screen.getByRole("textbox", { name: "Nombre" }), {
      target: { value: "  Semana de Datos  " },
    });
    fireEvent.change(screen.getByRole("textbox", { name: "Etiqueta" }), {
      target: { value: "  " },
    });
    fireEvent.change(screen.getByLabelText("Fecha final"), {
      target: { value: "2026-06-20" },
    });
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(onSubmit).toHaveBeenCalledWith({
      description: "Serie de actividades sobre datos abiertos.",
      endDate: "2026-06-20",
      label: null,
      name: "Semana de Datos",
      startDate: "2026-06-15",
    });
  });

  it("validates the name and the date range with focus on the first error", async () => {
    const { onSubmit } = renderForm();
    const user = setupUser();

    fireEvent.change(screen.getByRole("textbox", { name: "Nombre" }), {
      target: { value: "   " },
    });
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole("textbox", { name: "Nombre" })).toHaveFocus();

    fireEvent.change(screen.getByRole("textbox", { name: "Nombre" }), {
      target: { value: "Nombre valido" },
    });
    fireEvent.change(screen.getByLabelText("Fecha final"), {
      target: { value: "2026-06-14" },
    });
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Fecha final")).toHaveFocus();
    expect(screen.getByText(/fecha final no puede ser anterior/i)).toBeVisible();
  });

  it("keeps the written data and explains a server rejection", () => {
    renderForm({ failure: "conflict" });

    expect(screen.getByText(/pudo ser archivado/i)).toBeVisible();
    expect(screen.getByText(/actividades existentes fuera del rango/i)).toBeVisible();
    expect(screen.getByRole("textbox", { name: "Nombre" })).toHaveValue(
      "Semana de Innovacion Academica",
    );
    expect(screen.queryByText(/backend/i)).toBeNull();
  });

  it("offers an explicit refresh after a conflict without repeating the mutation", async () => {
    const onRefresh = vi.fn();
    const { onSubmit } = renderForm({ failure: "conflict", onRefresh });
    const user = setupUser();

    await user.click(screen.getByRole("button", { name: "Actualizar listado" }));

    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("disables the refresh while the list is being read again", () => {
    renderForm({ failure: "notFound", isRefreshing: true, onRefresh: vi.fn() });

    expect(screen.getByRole("button", { name: "Actualizar listado" })).toBeDisabled();
  });

  it("does not offer a refresh without a handler or for unrelated failures", () => {
    const { rerender, onCancel, onSubmit } = renderForm({ failure: "conflict" });

    expect(screen.queryByRole("button", { name: "Actualizar listado" })).toBeNull();

    rerender(
      <EditEventProgramForm
        failure="invalidRequest"
        isSubmitting={false}
        onCancel={onCancel}
        onSubmit={onSubmit}
        program={additionalProgram()}
      />,
    );

    expect(screen.queryByRole("button", { name: "Actualizar listado" })).toBeNull();
  });

  it("omits the dates and lifecycle controls of the permanent agenda", async () => {
    const program = additionalProgram({
      description: null,
      endDate: null,
      id: "program-fic-default",
      isDefault: true,
      label: "FIC",
      name: "Programa de Eventos de Ingenieria Civil",
      startDate: null,
    });
    const { onSubmit } = renderForm({ program });
    const user = setupUser();

    expect(screen.queryByLabelText("Fecha inicial")).toBeNull();
    expect(screen.queryByLabelText("Fecha final")).toBeNull();
    expect(screen.getByText(/ciclo de vida lo controla la unidad/i)).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(onSubmit).toHaveBeenCalledWith({
      description: null,
      label: "FIC",
      name: "Programa de Eventos de Ingenieria Civil",
    });
  });

  it("cancels and disables its controls while submitting", async () => {
    const { onCancel, rerender, onSubmit } = renderForm();
    const user = setupUser();

    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(onCancel).toHaveBeenCalledTimes(1);

    rerender(
      <EditEventProgramForm
        failure={null}
        isSubmitting
        onCancel={onCancel}
        onSubmit={onSubmit}
        program={additionalProgram()}
      />,
    );

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Guardando..." })).toBeDisabled(),
    );
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeDisabled();
    expect(screen.getByRole("textbox", { name: "Nombre" })).toBeDisabled();
  });
});
