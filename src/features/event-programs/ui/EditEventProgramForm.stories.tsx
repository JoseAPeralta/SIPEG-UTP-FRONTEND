import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fireEvent, fn, userEvent } from "storybook/test";

import { createEventProgramListItem } from "@/test/factories";

import { EditEventProgramForm } from "./EditEventProgramForm";

const additionalProgram = createEventProgramListItem({
  description: "Serie de actividades sobre datos abiertos y servicios academicos.",
  endDate: "2026-06-19",
  id: "program-innovation-week",
  isDefault: false,
  label: "Semana de innovacion",
  name: "Semana de Innovacion Academica",
  organizationalUnit: {
    id: "fisc",
    name: "Facultad de Ingenieria de Sistemas Computacionales",
    type: "FACULTY",
  },
  startDate: "2026-06-15",
});

const permanentAgenda = createEventProgramListItem({
  description: "Programa predeterminado de la Facultad de Ingenieria Civil.",
  endDate: null,
  id: "program-fic-default",
  isDefault: true,
  label: "FIC",
  name: "Programa de Eventos de Ingenieria Civil",
  organizationalUnit: { id: "fic", name: "Facultad de Ingenieria Civil", type: "FACULTY" },
  startDate: null,
});

const meta = {
  args: {
    failure: null,
    isSubmitting: false,
    onCancel: fn(),
    onSubmit: fn(),
    program: additionalProgram,
  },
  component: EditEventProgramForm,
  parameters: {
    docs: {
      description: {
        component:
          "Formulario de edición de un programa. La unidad propietaria y `isDefault` se muestran en solo lectura; la agenda permanente omite las fechas y un rechazo conserva lo escrito.",
      },
    },
    layout: "padded",
  },
  tags: ["autodocs"],
  title: "Features/Event Programs/EditEventProgramForm",
} satisfies Meta<typeof EditEventProgramForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ args, canvas }) => {
    await expect(canvas.getByRole("textbox", { name: "Nombre" })).toHaveValue(
      "Semana de Innovacion Academica",
    );
    await expect(canvas.getByLabelText("Unidad")).toBeDisabled();

    await userEvent.clear(canvas.getByRole("textbox", { name: "Nombre" }));
    await userEvent.type(canvas.getByRole("textbox", { name: "Nombre" }), "Semana de Datos");
    await userEvent.click(canvas.getByRole("button", { name: "Guardar cambios" }));

    await expect(args.onSubmit).toHaveBeenCalledWith({
      description: "Serie de actividades sobre datos abiertos y servicios academicos.",
      endDate: "2026-06-19",
      label: "Semana de innovacion",
      name: "Semana de Datos",
      startDate: "2026-06-15",
    });
  },
};

export const PermanentAgenda: Story = {
  args: { program: permanentAgenda },
  play: async ({ args, canvas }) => {
    await expect(canvas.queryByLabelText("Fecha inicial")).toBeNull();
    await expect(canvas.getByText(/ciclo de vida lo controla la unidad/i)).toBeVisible();

    await userEvent.click(canvas.getByRole("button", { name: "Guardar cambios" }));

    await expect(args.onSubmit).toHaveBeenCalledWith({
      description: "Programa predeterminado de la Facultad de Ingenieria Civil.",
      label: "FIC",
      name: "Programa de Eventos de Ingenieria Civil",
    });
  },
};

export const ValidationErrors: Story = {
  play: async ({ args, canvas }) => {
    await userEvent.clear(canvas.getByRole("textbox", { name: "Nombre" }));
    await fireEvent.change(canvas.getByLabelText("Fecha final"), {
      target: { value: "2026-06-14" },
    });
    await userEvent.click(canvas.getByRole("button", { name: "Guardar cambios" }));

    await expect(await canvas.findByText("Escriba el nombre del programa.")).toBeVisible();
    await expect(canvas.getByText(/fecha final no puede ser anterior/i)).toBeVisible();
    await expect(args.onSubmit).not.toHaveBeenCalled();
  },
};

export const RejectedByServer: Story = {
  args: { failure: "conflict" },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText(/actividades existentes fuera del rango/i)).toBeVisible();
  },
};

export const Submitting: Story = {
  args: { isSubmitting: true },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("button", { name: "Guardando..." })).toBeDisabled();
    await expect(canvas.getByRole("button", { name: "Cancelar" })).toBeDisabled();
  },
};
