import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";

import { SelectionRequiredState } from "./SelectionRequiredState";

const meta = {
  args: {
    message: "Seleccione un programa de eventos o una actividad para continuar.",
    title: "Seleccione un contexto de trabajo",
  },
  component: SelectionRequiredState,
  parameters: {
    docs: {
      description: {
        component:
          "Explica que una vista operativa necesita un programa de eventos o una actividad antes de continuar. No ofrece accion: la seleccion se hace en el selector del panel.",
      },
    },
  },
  title: "Shared/UI/SelectionRequiredState",
} satisfies Meta<typeof SelectionRequiredState>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SelectionRequired: Story = {
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("heading", { name: /seleccione un contexto de trabajo/i }),
    ).toBeVisible();
    await expect(
      canvas.getByText(/seleccione un programa de eventos o una actividad/i),
    ).toBeVisible();
    await expect(canvas.queryByRole("button")).toBeNull();
  },
};
