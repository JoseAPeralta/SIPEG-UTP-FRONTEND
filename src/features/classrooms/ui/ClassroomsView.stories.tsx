import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";

import { useSessionStore } from "@/store/session";
import { createAuthenticatedUser, createAuthTokens } from "@/test/factories";

import { ClassroomsView } from "./ClassroomsView";

const meta = {
  component: ClassroomsView,
  parameters: {
    docs: {
      description: {
        component:
          "Gestion administrativa de aulas y laboratorios. El listado pide siempre aulas activas e inactivas porque el backend solo devuelve las activas cuando se omite el filtro de estado, y la reactivacion necesita ver las inactivas.",
      },
    },
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  title: "Features/Classrooms/ClassroomsView",
} satisfies Meta<typeof ClassroomsView>;

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
    await expect(await canvas.findByRole("heading", { level: 1, name: "Aulas" })).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Nueva aula" })).toBeVisible();
    await expect(await canvas.findByText("Aula 10B")).toBeVisible();
    await expect(canvas.getByRole("link", { name: /ver detalle de aula 10b/i })).toHaveAttribute(
      "href",
      "/admin/aulas/aula-10",
    );
  },
};

export const WithoutMatches: Story = {
  beforeEach: () => {
    useSessionStore.getState().setSession({
      currentUser: createAuthenticatedUser({ globalRole: "ADMIN" }),
      tokens: createAuthTokens(),
    });
  },
  parameters: {
    docs: {
      description: {
        story: "El filtro de estado deja sin resultados cuando no hay aulas inactivas.",
      },
    },
  },
  play: async ({ canvas, userEvent }) => {
    await expect(await canvas.findByRole("heading", { level: 1, name: "Aulas" })).toBeVisible();
    await userEvent.selectOptions(canvas.getByRole("combobox", { name: "Estado" }), "inactive");

    await expect(
      await canvas.findByText(/no hay aulas que coincidan con los filtros/i),
    ).toBeVisible();
  },
};

export const CreatingAClassroom: Story = {
  beforeEach: () => {
    useSessionStore.getState().setSession({
      currentUser: createAuthenticatedUser({ globalRole: "ADMIN" }),
      tokens: createAuthTokens(),
    });
  },
  parameters: {
    docs: {
      description: {
        story: "El formulario de alta solo admite los campos que el contrato acepta.",
      },
    },
  },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(await canvas.findByRole("button", { name: "Nueva aula" }));

    await expect(canvas.getByRole("textbox", { name: "Nombre" })).toBeVisible();
    await expect(canvas.getByRole("spinbutton", { name: "Capacidad" })).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Guardar aula" })).toBeDisabled();
  },
};
