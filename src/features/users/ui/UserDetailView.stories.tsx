import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";

import { useSessionStore } from "@/store/session";
import { createAuthenticatedUser, createAuthTokens } from "@/test/factories";

import { UserDetailView } from "./UserDetailView";

const meta = {
  component: UserDetailView,
  args: { userId: "user-2" },
  parameters: { layout: "fullscreen" },
  tags: ["autodocs"],
  title: "Features/Users/UserDetailView",
} satisfies Meta<typeof UserDetailView>;

export default meta;
type Story = StoryObj<typeof meta>;

function authenticateAdministrator() {
  useSessionStore.getState().setSession({
    currentUser: createAuthenticatedUser({ globalRole: "ADMIN" }),
    tokens: createAuthTokens(),
  });
}

export const Default: Story = {
  beforeEach: authenticateAdministrator,
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByRole("heading", { level: 1, name: "Carlos Mendez" }),
    ).toBeVisible();
    await expect(canvas.getByLabelText(/correo electr[oó]nico/i)).toBeDisabled();
    await expect(canvas.getByRole("combobox", { name: "Rol global" })).toBeEnabled();
  },
};

export const PromotingAUser: Story = {
  beforeEach: authenticateAdministrator,
  parameters: {
    docs: {
      description: {
        story: "Promover una cuenta activa actualiza la vista sin recargar la aplicacion.",
      },
    },
  },
  play: async ({ canvas, userEvent }) => {
    await canvas.findByRole("heading", { level: 1, name: "Carlos Mendez" });

    await userEvent.selectOptions(canvas.getByRole("combobox", { name: "Rol global" }), "ADMIN");
    await userEvent.click(canvas.getByRole("button", { name: "Guardar cambios" }));

    await expect(await canvas.findByText(/Rol actual: Administrador/)).toBeVisible();
  },
};

export const ProtectingTheActingAdministrator: Story = {
  args: { userId: "user-1" },
  beforeEach: authenticateAdministrator,
  parameters: {
    docs: {
      description: {
        story:
          "El backend rechaza desactivar la propia cuenta y la UI explica la salvaguarda sin reflejar el mensaje interno.",
      },
    },
  },
  play: async ({ canvas, userEvent }) => {
    await canvas.findByRole("heading", { level: 1, name: "Mariana Rodriguez" });

    await userEvent.click(canvas.getByRole("button", { name: "Desactivar cuenta" }));
    await userEvent.click(canvas.getByRole("button", { name: /Confirmar desactivación/i }));

    const alert = await canvas.findByRole("alert");
    await expect(alert).toHaveTextContent(/no puede desactivar su propia cuenta/i);
  },
};

export const UnknownUser: Story = {
  args: { userId: "missing" },
  beforeEach: authenticateAdministrator,
  play: async ({ canvas }) => {
    await expect(await canvas.findByText("La cuenta solicitada ya no existe")).toBeVisible();
    await expect(
      canvas.getByRole("link", { name: /volver al listado de usuarios/i }),
    ).toHaveAttribute("href", "/admin/usuarios");
  },
};
