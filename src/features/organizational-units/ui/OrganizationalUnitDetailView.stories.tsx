import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";

import { createAuthenticatedUser, createAuthTokens } from "@/test/factories";
import { useSessionStore } from "@/store/session";

import { OrganizationalUnitDetailView } from "./OrganizationalUnitDetailView";

const meta = {
  args: { unitId: "fic" },
  component: OrganizationalUnitDetailView,
  parameters: { layout: "fullscreen" },
  tags: ["autodocs"],
  title: "Features/OrganizationalUnits/OrganizationalUnitDetailView",
} satisfies Meta<typeof OrganizationalUnitDetailView>;

export default meta;
type Story = StoryObj<typeof meta>;

function useAdminSession() {
  useSessionStore.getState().setSession({
    currentUser: createAuthenticatedUser({ globalRole: "ADMIN" }),
    tokens: createAuthTokens(),
  });
}

export const Default: Story = {
  beforeEach: useAdminSession,
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByRole("heading", { name: /facultad de ingenier[ií]a civil/i }),
    ).toBeVisible();
    await expect(canvas.getByText(/agenda permanente/i)).toBeVisible();
  },
};

export const DefaultProgramConflict: Story = {
  args: { unitId: "fisc" },
  beforeEach: useAdminSession,
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(await canvas.findByRole("button", { name: /desactivar unidad/i }));

    await expect(await canvas.findByRole("alert")).toHaveTextContent(
      /actividades programadas o en curso/i,
    );
    await expect(canvas.getByRole("button", { name: /reintentar/i })).toBeVisible();
  },
};
