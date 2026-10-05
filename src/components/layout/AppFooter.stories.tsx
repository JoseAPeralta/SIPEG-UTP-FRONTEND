import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";

import { AppFooter } from "./AppFooter";

const meta = {
  component: AppFooter,
  parameters: {
    docs: {
      description: {
        component:
          "Footer compartido de SIPEG. Cierra el marco de la aplicacion en rutas publicas y administrativas.",
      },
    },
  },
  tags: ["autodocs"],
  title: "Layout/AppFooter",
} satisfies Meta<typeof AppFooter>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("contentinfo")).toBeVisible();
    await expect(canvas.getByText("SIPEG")).toBeVisible();
    await expect(canvas.getByText(/gestion de eventos academicos y asistencia/i)).toBeVisible();
  },
};
