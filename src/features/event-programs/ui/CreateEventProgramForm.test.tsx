import { fireEvent, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { createOrganizationalUnit } from "@/test/factories";
import { renderWithProviders } from "@/test/render";
import { setupUser } from "@/test/user";

import { CreateEventProgramForm, type CreateEventProgramFormProps } from "./CreateEventProgramForm";

const units = [
  createOrganizationalUnit({ id: "fic", name: "Facultad de Ingenieria Civil" }),
  createOrganizationalUnit({ id: "fisc", name: "Facultad de Ingenieria de Sistemas" }),
];

function renderForm(overrides: Partial<CreateEventProgramFormProps> = {}) {
  const props: CreateEventProgramFormProps = {
    failure: null,
    isSubmitting: false,
    onCancel: vi.fn(),
    onSubmit: vi.fn().mockResolvedValue(undefined),
    units,
    ...overrides,
  };

  return { props, ...renderWithProviders(<CreateEventProgramForm {...props} />) };
}

function changeDate(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

describe("CreateEventProgramForm", () => {
  it("starts with the focus on the name field", () => {
    renderForm();

    expect(screen.getByRole("textbox", { name: "Nombre" })).toHaveFocus();
  });

  it("moves through every control with Tab and submits with Enter", async () => {
    const user = setupUser();
    const { props } = renderForm();

    expect(screen.getByRole("textbox", { name: "Nombre" })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("combobox", { name: "Unidad" })).toHaveFocus();
    await user.tab();
    expect(screen.getByLabelText("Fecha inicial")).toHaveFocus();
    await user.tab();
    expect(screen.getByLabelText("Fecha final")).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("textbox", { name: "Etiqueta" })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("textbox", { name: "Descripción" })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("button", { name: "Cancelar" })).toHaveFocus();
    await user.tab();
    const submitButton = screen.getByRole("button", { name: "Crear programa" });
    expect(submitButton).toHaveFocus();

    await user.type(screen.getByRole("textbox", { name: "Nombre" }), "Cierre de ano");
    await user.selectOptions(screen.getByRole("combobox", { name: "Unidad" }), "fic");
    changeDate("Fecha inicial", "2026-12-18");
    changeDate("Fecha final", "2026-12-20");
    submitButton.focus();
    await user.keyboard("{Enter}");

    await waitFor(() => expect(props.onSubmit).toHaveBeenCalledTimes(1));
  });

  it("associates every validation error with its own field", async () => {
    const user = setupUser();
    renderForm();

    await user.click(screen.getByRole("button", { name: "Crear programa" }));

    const name = screen.getByRole("textbox", { name: "Nombre" });
    expect(name).toHaveAttribute("aria-invalid", "true");
    expect(name).toHaveAccessibleErrorMessage("Escriba el nombre del programa.");
    const unit = screen.getByRole("combobox", { name: "Unidad" });
    expect(unit).toHaveAttribute("aria-invalid", "true");
    expect(unit).toHaveAccessibleErrorMessage("Seleccione una unidad.");
  });

  it("reports every missing field and focuses the name", async () => {
    const user = setupUser();
    const { props } = renderForm();

    await user.click(screen.getByRole("button", { name: "Crear programa" }));

    expect(await screen.findByText("Escriba el nombre del programa.")).toBeVisible();
    expect(screen.getByText("Seleccione una unidad.")).toBeVisible();
    expect(screen.getByText("Indique una fecha inicial válida.")).toBeVisible();
    expect(screen.getByText("Indique una fecha final válida.")).toBeVisible();
    expect(screen.getByRole("textbox", { name: "Nombre" })).toHaveFocus();
    expect(props.onSubmit).not.toHaveBeenCalled();
  });

  it("rejects an inverted range before sending", async () => {
    const user = setupUser();
    const { props } = renderForm();

    await user.type(screen.getByRole("textbox", { name: "Nombre" }), "Cierre de ano");
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Unidad" }),
      await screen.findByRole("option", { name: "Facultad de Ingenieria de Sistemas" }),
    );
    changeDate("Fecha inicial", "2026-12-20");
    changeDate("Fecha final", "2026-12-18");
    await user.click(screen.getByRole("button", { name: "Crear programa" }));

    expect(
      await screen.findByText("La fecha final no puede ser anterior a la inicial."),
    ).toBeVisible();
    expect(props.onSubmit).not.toHaveBeenCalled();
  });

  it("reports a unit that is no longer in the active catalog before sending", async () => {
    const user = setupUser();
    const { props, rerender } = renderForm();

    await user.type(screen.getByRole("textbox", { name: "Nombre" }), "Cierre de ano");
    await user.selectOptions(screen.getByRole("combobox", { name: "Unidad" }), "fisc");
    changeDate("Fecha inicial", "2026-12-18");
    changeDate("Fecha final", "2026-12-20");

    rerender(<CreateEventProgramForm {...props} units={[units[0]!]} />);
    await user.click(screen.getByRole("button", { name: "Crear programa" }));

    expect(await screen.findByText("La unidad seleccionada ya no está activa.")).toBeVisible();
    expect(props.onSubmit).not.toHaveBeenCalled();
  });

  it("submits the normalized request", async () => {
    const user = setupUser();
    const { props } = renderForm();

    await user.type(screen.getByRole("textbox", { name: "Nombre" }), "  Cierre 2026  ");
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Unidad" }),
      await screen.findByRole("option", { name: "Facultad de Ingenieria Civil" }),
    );
    changeDate("Fecha inicial", "2026-12-18");
    changeDate("Fecha final", "2026-12-20");
    await user.type(screen.getByRole("textbox", { name: "Etiqueta" }), "  Cierre  ");
    await user.type(screen.getByRole("textbox", { name: "Descripción" }), "  ");
    await user.click(screen.getByRole("button", { name: "Crear programa" }));

    await waitFor(() =>
      expect(props.onSubmit).toHaveBeenCalledWith({
        description: null,
        endDate: "2026-12-20",
        label: "Cierre",
        name: "Cierre 2026",
        organizationalUnitId: "fic",
        startDate: "2026-12-18",
      }),
    );
  });

  it("disables every control while submitting", () => {
    renderForm({ isSubmitting: true });

    expect(screen.getByRole("textbox", { name: "Nombre" })).toBeDisabled();
    expect(screen.getByRole("combobox", { name: "Unidad" })).toBeDisabled();
    expect(screen.getByLabelText("Fecha inicial")).toBeDisabled();
    expect(screen.getByLabelText("Fecha final")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeDisabled();
    const submitButton = screen
      .getAllByRole("button", { hidden: true })
      .find((button) => button.getAttribute("type") === "submit");
    expect(submitButton).toBeDisabled();
  });

  it("shows a localized failure without the backend detail", async () => {
    const user = setupUser();
    const { props, rerender } = renderForm();

    rerender(<CreateEventProgramForm {...props} failure="invalidRequest" />);

    expect(await screen.findByText(/revise las fechas/i)).toBeVisible();
    expect(screen.queryByText(/backend/i)).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(props.onCancel).toHaveBeenCalled();
  });
});
