import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";

import { useSessionStore } from "@/store/session";
import { createAuthenticatedUser, createAuthTokens } from "@/test/factories";

import { CareersView } from "./CareersView";

const meta = {
  component: CareersView,
  parameters: { layout: "fullscreen" },
  tags: ["autodocs"],
  title: "Features/Careers/CareersView",
} satisfies Meta<typeof CareersView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  beforeEach: () => {
    useSessionStore.getState().setSession({
      currentUser: createAuthenticatedUser({ globalRole: "ADMIN" }),
      tokens: createAuthTokens(),
    });
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole("heading", { name: "Carreras" })).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Nueva carrera" })).toBeVisible();
  },
};
