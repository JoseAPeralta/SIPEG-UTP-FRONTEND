import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";

import { useSessionStore } from "@/store/session";
import { createAuthenticatedUser, createAuthTokens } from "@/test/factories";

import { OrganizationalUnitsView } from "./OrganizationalUnitsView";

const meta = {
  beforeEach: () => {
    useSessionStore.getState().setSession({
      currentUser: createAuthenticatedUser({ globalRole: "ADMIN" }),
      tokens: createAuthTokens(),
    });
  },
  component: OrganizationalUnitsView,
  parameters: { layout: "fullscreen" },
  tags: ["autodocs"],
  title: "Features/OrganizationalUnits/OrganizationalUnitsView",
} satisfies Meta<typeof OrganizationalUnitsView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByRole("heading", { name: /unidades organizativas/i }),
    ).toBeVisible();
    await expect(canvas.getByRole("textbox", { name: /buscar unidades/i })).toBeVisible();
  },
};

export const CreateForm: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(await canvas.findByRole("button", { name: /nueva unidad/i }));

    await expect(canvas.getByRole("textbox", { name: /nombre/i })).toBeVisible();
    await expect(canvas.getByRole("textbox", { name: /c[oó]digo/i })).toBeVisible();
    await expect(canvas.getByRole("button", { name: /guardar unidad/i })).toBeDisabled();
  },
};
