import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";

import { useSessionStore } from "@/store/session";
import { useWorkingContextStore } from "@/store/workingContext";
import { createAuthenticatedUser, createAuthTokens } from "@/test/factories";

import { AdminMenu } from "./AdminMenu";

function authenticateAdministrator() {
  useSessionStore.getState().setSession({
    currentUser: createAuthenticatedUser({ globalRole: "ADMIN" }),
    tokens: createAuthTokens(),
  });
}

const meta = {
  component: AdminMenu,
  parameters: {
    docs: {
      description: {
        component:
          "Navegacion del panel administrativo y selector de contexto de trabajo. Exige sesion y rol `ADMIN`, y el backend conserva la autoridad final.",
      },
    },
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  title: "Layout/AdminMenu",
} satisfies Meta<typeof AdminMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Administrator: Story = {
  beforeEach: () => {
    useWorkingContextStore.getState().clearWorkingContext();
    authenticateAdministrator();
  },
  play: async ({ canvas }) => {
    const panelNavigation = await canvas.findByRole("navigation", {
      name: /navegacion del panel/i,
    });

    for (const label of [
      /panel/i,
      /eventos/i,
      /aulas/i,
      /ponentes/i,
      /usuarios/i,
      /asistencia/i,
      /certificados/i,
      /reportes/i,
    ]) {
      await expect(within(panelNavigation).getByRole("link", { name: label })).toBeVisible();
    }

    await expect(canvas.getByRole("link", { name: /aulas/i })).toHaveAttribute(
      "href",
      "/admin/aulas",
    );
    await expect(canvas.getByRole("link", { name: /usuarios/i })).toHaveAttribute(
      "href",
      "/admin/usuarios",
    );
  },
};

export const WithoutContextSelected: Story = {
  beforeEach: () => {
    useWorkingContextStore.getState().clearWorkingContext();
    authenticateAdministrator();
  },
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByText(/las demas paginas requieren seleccionar un programa o actividad/i),
    ).toBeVisible();
  },
};

export const WithContextSelected: Story = {
  beforeEach: () => {
    authenticateAdministrator();
    useWorkingContextStore
      .getState()
      .setWorkingContext({ id: "program-innovation-week", kind: "eventProgram" });
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText(/las opciones del panel usan:/i)).toBeVisible();
  },
};
