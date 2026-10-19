import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fireEvent, waitFor, within } from "storybook/test";

import { useSessionStore } from "@/store/session";
import { ActivityStoryProviders } from "@/test/ActivityStoryProviders";
import { createAuthenticatedUser, createAuthTokens } from "@/test/factories";

import { ProgramActivitiesView } from "./ProgramActivitiesView";

const PROGRAM_ID = "program-innovation-week";

function ActivityViewStory() {
  return <ProgramActivitiesView mode="administration" programId={PROGRAM_ID} />;
}

const meta = {
  component: ActivityViewStory,
  decorators: [
    (Story, context) => (
      <ActivityStoryProviders key={context.id}>
        <Story />
      </ActivityStoryProviders>
    ),
  ],
  parameters: { layout: "fullscreen" },
  tags: ["autodocs"],
  title: "Features/Activity Catalog/ProgramActivitiesView",
} satisfies Meta<typeof ActivityViewStory>;

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
      await canvas.findByRole("heading", { level: 1, name: "Actividades" }),
    ).toBeVisible();
    await expect(
      await canvas.findByRole("article", { name: /gobernanza de datos abiertos universitarios/i }),
    ).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Nueva actividad" })).toBeVisible();
  },
};

export const SearchingActivities: Story = {
  beforeEach: authenticateAdministrator,
  parameters: {
    docs: {
      description: {
        story: "La busqueda viaja al backend y el listado solo conserva las coincidencias.",
      },
    },
  },
  play: async ({ canvas, userEvent }) => {
    await canvas.findByRole("article", { name: /gobernanza de datos abiertos universitarios/i });

    await userEvent.type(
      canvas.getByRole("textbox", { name: "Buscar actividades" }),
      "ciberseguridad",
    );
    await userEvent.click(canvas.getByRole("button", { name: "Buscar" }));

    await expect(
      await canvas.findByRole("article", { name: /ciberseguridad en servicios estudiantiles/i }),
    ).toBeVisible();
    await waitFor(() =>
      expect(
        canvas.queryByRole("article", { name: /gobernanza de datos abiertos universitarios/i }),
      ).toBeNull(),
    );
  },
};

export const CreatingActivity: Story = {
  beforeEach: authenticateAdministrator,
  parameters: {
    docs: {
      description: {
        story:
          "El alta captura los campos del contrato y crea un borrador del programa; la confirmacion explica que aun no se publica.",
      },
    },
  },
  play: async ({ canvas, userEvent }) => {
    await canvas.findByRole("article", { name: /gobernanza de datos abiertos universitarios/i });

    await userEvent.click(canvas.getByRole("button", { name: "Nueva actividad" }));
    const form = within(canvas.getByRole("form", { name: "Nueva actividad" }));
    await userEvent.type(form.getByRole("textbox", { name: "Nombre" }), "Feria de ciencias");
    await userEvent.selectOptions(form.getByRole("combobox", { name: "Tipo" }), "WORKSHOP");
    await fireEvent.change(form.getByLabelText("Fecha"), { target: { value: "2026-06-20" } });
    await fireEvent.change(form.getByLabelText("Hora de inicio"), { target: { value: "09:00" } });
    await fireEvent.change(form.getByLabelText("Hora de fin"), { target: { value: "11:00" } });
    await userEvent.click(form.getByRole("button", { name: "Crear actividad" }));

    await expect(await canvas.findByText(/creó como borrador/i)).toBeVisible();
    await expect(await canvas.findByRole("article", { name: "Feria de ciencias" })).toBeVisible();
  },
};
