import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, waitFor, within } from "storybook/test";
import { useEffect } from "react";
import { useNavigate } from "react-router";

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

function AdminMenuFrame({ active }: { active: string }) {
  const navigate = useNavigate();

  useEffect(() => {
    void navigate(active);
  }, [active, navigate]);

  return <AdminMenu />;
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
      /unidades/i,
      /carreras/i,
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
    await expect(canvas.getByRole("link", { name: /unidades/i })).toHaveAttribute(
      "href",
      "/admin/unidades",
    );
    await expect(canvas.getByRole("link", { name: /carreras/i })).toHaveAttribute(
      "href",
      "/admin/carreras",
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

export const ClassroomDetailActive: Story = {
  render: () => <AdminMenuFrame active="/admin/aulas/aula-10" />,
  beforeEach: () => {
    useWorkingContextStore.getState().clearWorkingContext();
    authenticateAdministrator();
  },
  play: async ({ canvas }) => {
    const panelNavigation = await canvas.findByRole("navigation", {
      name: /navegacion del panel/i,
    });

    await waitFor(async () => {
      await expect(within(panelNavigation).getByRole("link", { name: "Aulas" })).toHaveAttribute(
        "aria-current",
        "page",
      );
    });
    await expect(
      within(panelNavigation).queryByRole("link", { current: "page", name: /panel/i }),
    ).toBeNull();
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
