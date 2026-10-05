import type { Meta, StoryObj } from "@storybook/react-vite";

import { StatusPanel } from "./StatusPanel";

const meta = {
  args: {
    children: "Cargando modulo SIPEG...",
  },
  component: StatusPanel,
  parameters: {
    docs: {
      description: {
        component:
          'Anuncia una linea corta de estado. Usa `role="status"` para progreso y `role="alert"` para fallos.',
      },
    },
  },
  title: "Shared/UI/StatusPanel",
} satisfies Meta<typeof StatusPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Loading: Story = {};

export const Alert: Story = {
  args: {
    children: "Sin conexion con el servicio.",
    role: "alert",
  },
};
