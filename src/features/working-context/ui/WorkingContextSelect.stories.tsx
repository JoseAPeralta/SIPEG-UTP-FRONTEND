import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent } from "storybook/test";
import { useState, type ReactNode } from "react";

import { AppAdaptersProvider, createAppAdapters } from "@/app/adapters";
import { QueryProvider, createQueryClient } from "@/app/query";
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
          "Selecciona el programa de eventos o la actividad que actua como contexto de trabajo para asistencia, certificados y reportes. Ofrece todos los programas legibles con su estado, anuncia una seleccion retirada por reconciliacion y la seleccion vive en memoria: se limpia al cerrar sesion.",
      },
    },
  },
  tags: ["autodocs"],
  title: "Features/Working Context/WorkingContextSelect",
} satisfies Meta<typeof WorkingContextSelect>;

export default meta;
type Story = StoryObj<typeof meta>;

function authenticateAdministrator() {
  useWorkingContextStore.getState().clearWorkingContext();
  useSessionStore.getState().setSession({
    currentUser: createAuthenticatedUser({ globalRole: "ADMIN" }),
    tokens: createAuthTokens(),
  });
}

/** Catalogo caido para el estado de error y reintento. */
function FailingCatalogProviders({ children }: { children: ReactNode }) {
  const [adapters] = useState(() => {
    const base = createAppAdapters({ source: "mock" });

    return {
      ...base,
      activityCatalog: {
        ...base.activityCatalog,
        loadCatalog: () => Promise.reject(new Error("catalogo caido")),
      },
    };
  });
  const [client] = useState(() =>
    createQueryClient({ defaultOptions: { queries: { retry: false } } }),
  );

  return (
    <AppAdaptersProvider adapters={adapters}>
      <QueryProvider client={client}>{children}</QueryProvider>
    </AppAdaptersProvider>
  );
}

export const WithoutSelection: Story = {
  beforeEach: () => {
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
    authenticateAdministrator();
    useWorkingContextStore
      .getState()
      .setWorkingContext({ id: "program-innovation-week", kind: "eventProgram" });
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
    authenticateAdministrator();
    useWorkingContextStore
      .getState()
      .setWorkingContext({ id: "activity-open-data-governance", kind: "activity" });
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

export const ArchivedProgramSelected: Story = {
  beforeEach: () => {
    authenticateAdministrator();
    useWorkingContextStore
      .getState()
      .setWorkingContext({ id: "program-robotics-competition-2024", kind: "eventProgram" });
  },
  parameters: {
    docs: {
      description: {
        story:
          "Un programa archivado que sigue siendo legible conserva su seleccion y muestra su estado en la opcion.",
      },
    },
  },
  play: async ({ canvas }) => {
    const select = await canvas.findByRole("combobox", { name: /contexto de trabajo/i });

    await canvas.findByRole("option", { name: /competencia de robotica 2024 · archivado/i });
    await expect(select).toHaveValue("eventProgram:program-robotics-competition-2024");
  },
};

export const SelectionRevoked: Story = {
  beforeEach: () => {
    authenticateAdministrator();
    useWorkingContextStore.getState().noteRevokedSelection();
  },
  parameters: {
    docs: {
      description: {
        story:
          "Una relectura completa confirma que el contexto ya no existe: la seleccion se retira y se anuncia sin bloquear el selector.",
      },
    },
  },
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByText(/el contexto seleccionado ya no está disponible/i),
    ).toBeVisible();
    await expect(canvas.getByRole("combobox", { name: /contexto de trabajo/i })).toBeEnabled();
  },
};

export const CatalogError: Story = {
  decorators: [
    (Story) => (
      <FailingCatalogProviders>
        <Story />
      </FailingCatalogProviders>
    ),
  ],
  beforeEach: () => {
    authenticateAdministrator();
  },
  parameters: {
    docs: {
      description: {
        story:
          "Un fallo del catalogo se anuncia como error y ofrece reintento, sin afirmar que no haya contextos.",
      },
    },
  },
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByText(/no se pudieron cargar los contextos de trabajo/i),
    ).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Reintentar" })).toBeVisible();
  },
};
