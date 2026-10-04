import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, waitFor } from "storybook/test";

import { useSessionStore } from "@/store/session";
import { createAuthenticatedUser, createAuthTokens } from "@/test/factories";

import { UsersView } from "./UsersView";

const meta = {
  component: UsersView,
  parameters: { layout: "fullscreen" },
  tags: ["autodocs"],
  title: "Features/Users/UsersView",
} satisfies Meta<typeof UsersView>;

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
    await expect(await canvas.findByRole("heading", { level: 1, name: "Usuarios" })).toBeVisible();
    await expect(await canvas.findByText("Mariana Rodriguez")).toBeVisible();
    await expect(canvas.getByText("Carlos Mendez")).toBeVisible();
  },
};

export const FilteringByRole: Story = {
  beforeEach: authenticateAdministrator,
  parameters: {
    docs: {
      description: {
        story:
          "El filtro de rol viaja al backend y la lista se reemplaza por las cuentas que coinciden.",
      },
    },
  },
  play: async ({ canvas, userEvent }) => {
    await canvas.findByText("Carlos Mendez");

    await userEvent.selectOptions(canvas.getByRole("combobox", { name: "Rol" }), "ADMIN");

    await expect(await canvas.findByText("Mariana Rodriguez")).toBeVisible();
    await waitFor(() => expect(canvas.queryByText("Carlos Mendez")).toBeNull());
  },
};

export const ValidatingTheCreateForm: Story = {
  beforeEach: authenticateAdministrator,
  parameters: {
    docs: {
      description: {
        story:
          "El alta reutiliza la validacion del registro: un envio con datos incompletos anuncia el error localizado sin tocar el backend.",
      },
    },
  },
  play: async ({ canvas, userEvent }) => {
    await canvas.findByText("Mariana Rodriguez");

    await userEvent.click(canvas.getByRole("button", { name: "Nuevo usuario" }));
    await userEvent.type(canvas.getByRole("textbox", { name: "Nombre" }), "A");
    await userEvent.type(canvas.getByRole("textbox", { name: "Apellido" }), "B");
    await userEvent.type(canvas.getByRole("textbox", { name: /correo electr[oó]nico/i }), "a@b.co");
    await userEvent.type(canvas.getByRole("textbox", { name: /c[eé]dula/i }), "1");
    await userEvent.type(canvas.getByLabelText(/^contrase[nñ]a$/i), "corta");
    await userEvent.click(canvas.getByRole("button", { name: "Guardar usuario" }));

    await expect(
      await canvas.findByText("El nombre debe tener al menos 2 caracteres."),
    ).toBeVisible();
    await expect(
      canvas.getByText("La contraseña debe tener al menos 12 caracteres."),
    ).toBeVisible();
  },
};
