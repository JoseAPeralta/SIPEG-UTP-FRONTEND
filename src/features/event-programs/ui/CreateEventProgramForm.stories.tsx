import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fireEvent, fn, userEvent } from "storybook/test";

import { createOrganizationalUnit } from "@/test/factories";

import { CreateEventProgramForm } from "./CreateEventProgramForm";

const units = [
  createOrganizationalUnit({ id: "fic", name: "Facultad de Ingenieria Civil" }),
  createOrganizationalUnit({ id: "fisc", name: "Facultad de Ingenieria de Sistemas" }),
];

const meta = {
  args: {
    failure: null,
    isSubmitting: false,
    onCancel: fn(),
    onSubmit: fn(),
    units,
  },
  component: CreateEventProgramForm,
  parameters: {
    docs: {
      description: {
        component:
          "Formulario de creación de un programa adicional en borrador. Valida fechas reales y unidad activa antes del envío y conserva lo escrito ante un rechazo del servidor.",
      },
    },
    layout: "padded",
  },
  tags: ["autodocs"],
  title: "Features/Event Programs/CreateEventProgramForm",
} satisfies Meta<typeof CreateEventProgramForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ args, canvas }) => {
    await userEvent.type(canvas.getByRole("textbox", { name: "Nombre" }), "Cierre de Ano");
    await userEvent.selectOptions(canvas.getByRole("combobox", { name: "Unidad" }), "fic");
    await fireEvent.change(canvas.getByLabelText("Fecha inicial"), {
      target: { value: "2026-12-18" },
    });
    await fireEvent.change(canvas.getByLabelText("Fecha final"), {
      target: { value: "2026-12-20" },
    });
    await userEvent.type(canvas.getByRole("textbox", { name: "Etiqueta" }), "Cierre");
    await userEvent.click(canvas.getByRole("button", { name: "Crear programa" }));

    await expect(args.onSubmit).toHaveBeenCalledWith({
      description: null,
      endDate: "2026-12-20",
      label: "Cierre",
      name: "Cierre de Ano",
      organizationalUnitId: "fic",
      startDate: "2026-12-18",
    });
  },
};

export const ValidationErrors: Story = {
  play: async ({ args, canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Crear programa" }));

    await expect(await canvas.findByText("Escriba el nombre del programa.")).toBeVisible();
    await expect(canvas.getByText("Seleccione una unidad.")).toBeVisible();
    await expect(args.onSubmit).not.toHaveBeenCalled();
  },
};

export const RejectedByServer: Story = {
  args: { failure: "invalidRequest" },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText(/revise las fechas/i)).toBeVisible();
  },
};

export const Submitting: Story = {
  args: { isSubmitting: true },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("textbox", { name: "Nombre" })).toBeDisabled();
    await expect(canvas.getByRole("combobox", { name: "Unidad" })).toBeDisabled();
    await expect(canvas.getByRole("button", { name: "Cancelar" })).toBeDisabled();
  },
};
