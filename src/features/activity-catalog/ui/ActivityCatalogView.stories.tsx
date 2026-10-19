import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, waitFor } from "storybook/test";

import { useSessionStore } from "@/store/session";
import { useWorkingContextStore } from "@/store/workingContext";
import { ActivityStoryProviders } from "@/test/ActivityStoryProviders";
import { createAuthenticatedUser, createAuthTokens } from "@/test/factories";

import { ActivityCatalogView } from "./ActivityCatalogView";

function CatalogViewStory() {
  return <ActivityCatalogView />;
}

const meta = {
  component: CatalogViewStory,
  decorators: [
    (Story, context) => (
      <ActivityStoryProviders key={context.id}>
        <Story />
      </ActivityStoryProviders>
    ),
  ],
  parameters: { layout: "fullscreen" },
  title: "Features/Activity Catalog/ActivityCatalogView",
} satisfies Meta<typeof CatalogViewStory>;

export default meta;
type Story = StoryObj<typeof meta>;

function authenticateAdministrator() {
  useWorkingContextStore.getState().clearWorkingContext();
  useSessionStore.getState().setSession({
    currentUser: createAuthenticatedUser({ globalRole: "ADMIN" }),
    tokens: createAuthTokens(),
  });
}

export const Default: Story = {
  beforeEach: authenticateAdministrator,
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByRole("heading", { level: 1, name: /actividades academicas/i }),
    ).toBeVisible();
    await expect(
      await canvas.findByText(/gobernanza de datos abiertos universitarios/i),
    ).toBeVisible();
    await expect(canvas.getByText(/personas registradas/i)).toBeVisible();
    await expect(canvas.getAllByText("No disponible").length).toBeGreaterThan(0);
  },
};

export const FilteringActivities: Story = {
  beforeEach: authenticateAdministrator,
  parameters: {
    docs: {
      description: {
        story: "La busqueda acota las tarjetas sin pedir ningun detalle al servidor.",
      },
    },
  },
  play: async ({ canvas, userEvent }) => {
    await canvas.findByText(/gobernanza de datos abiertos universitarios/i);

    await userEvent.type(
      canvas.getByRole("textbox", { name: /buscar actividades/i }),
      "ciberseguridad",
    );

    await expect(
      await canvas.findByText(/ciberseguridad en servicios estudiantiles/i),
    ).toBeVisible();
    await waitFor(() =>
      expect(canvas.queryByText(/gobernanza de datos abiertos universitarios/i)).toBeNull(),
    );
  },
};

export const SelectingWorkingContext: Story = {
  beforeEach: authenticateAdministrator,
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(
      await canvas.findByRole("button", { name: /usar semana de innovacion academica en panel/i }),
    );

    await expect(await canvas.findByText(/contexto activo: semana de innovacion/i)).toBeVisible();
  },
};
