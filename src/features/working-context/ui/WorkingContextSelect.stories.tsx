import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent } from "storybook/test";

import { useSessionStore } from "@/store/session";
import { useWorkingContextStore } from "@/store/workingContext";
import { createAuthenticatedUser, createAuthTokens } from "@/test/factories";

import { WorkingContextSelect } from "./WorkingContextSelect";

const meta = {
  component: WorkingContextSelect,
  parameters: {
    docs: {
      description: {
        component:
          "Selecciona el programa de eventos o la actividad que actua como contexto de trabajo para asistencia, certificados y reportes. La seleccion vive en memoria y se limpia al cerrar sesion.",
      },
    },
  },
  tags: ["autodocs"],
  title: "Features/Working Context/WorkingContextSelect",
} satisfies Meta<typeof WorkingContextSelect>;

export default meta;
type Story = StoryObj<typeof meta>;

function authenticateAdministrator() {
  useSessionStore.getState().setSession({
    currentUser: createAuthenticatedUser({ globalRole: "ADMIN" }),
    tokens: createAuthTokens(),
  });
}

export const WithoutSelection: Story = {
  beforeEach: () => {
    useWorkingContextStore.getState().clearWorkingContext();
    authenticateAdministrator();
  },
  play: async ({ canvas }) => {
    const select = await canvas.findByRole("combobox", { name: /contexto de trabajo/i });

    await expect(select).toBeEnabled();
    await expect(select).toHaveValue("");
    await expect(
      canvas.getByText(/las demas paginas requieren seleccionar un programa o actividad/i),
    ).toBeVisible();
  },
};

export const ProgramSelected: Story = {
  beforeEach: () => {
    useWorkingContextStore
      .getState()
      .setWorkingContext({ id: "program-innovation-week", kind: "eventProgram" });
    authenticateAdministrator();
  },
  play: async ({ canvas }) => {
    const select = await canvas.findByRole("combobox", { name: /contexto de trabajo/i });

    await canvas.findByRole("option", { name: /semana de innovacion academica/i });
    await expect(select).toBeEnabled();
    await expect(select).toHaveValue("eventProgram:program-innovation-week");
    await expect(canvas.getByText(/las opciones del panel usan:/i)).toBeVisible();
  },
};

export const ActivitySelected: Story = {
  beforeEach: () => {
    useWorkingContextStore
      .getState()
      .setWorkingContext({ id: "activity-open-data-governance", kind: "activity" });
    authenticateAdministrator();
  },
  play: async ({ canvas }) => {
    const select = await canvas.findByRole("combobox", { name: /contexto de trabajo/i });

    await canvas.findByRole("option", { name: /gobernanza de datos abiertos universitarios/i });
    await expect(select).toBeEnabled();
    await expect(select).toHaveValue("activity:activity-open-data-governance");
    await expect(canvas.getByText(/las opciones del panel usan:/i)).toBeVisible();
  },
};

export const ChangeSelection: Story = {
  beforeEach: () => {
    useWorkingContextStore.getState().clearWorkingContext();
    authenticateAdministrator();
  },
  play: async ({ canvas }) => {
    const select = await canvas.findByRole("combobox", { name: /contexto de trabajo/i });

    await expect(
      await canvas.findByRole("option", { name: /semana de innovacion academica/i }),
    ).toBeVisible();

    await userEvent.selectOptions(select, "eventProgram:program-innovation-week");

    await expect(select).toHaveValue("eventProgram:program-innovation-week");
    await expect(canvas.getByText(/las opciones del panel usan:/i)).toBeVisible();

    await userEvent.selectOptions(select, "");

    await expect(
      canvas.getByText(/las demas paginas requieren seleccionar un programa o actividad/i),
    ).toBeVisible();
  },
};
