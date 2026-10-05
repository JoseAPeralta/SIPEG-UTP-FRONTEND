import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import {
  collaborationStorySession,
  storyScope,
  type CollaborationScenario,
} from "@/test/collaborationStories";
import { CollaborationStoryProviders } from "@/test/CollaborationStoryProviders";
import { OperationalScopeView } from "./OperationalScopeView";
const meta = {
  title: "Features/Collaboration/OperationalScopeView",
  component: OperationalScopeView,
  args: { scope: storyScope },
  beforeEach: () => collaborationStorySession(),
  decorators: [
    (Story, context) => (
      <CollaborationStoryProviders
        key={context.id}
        scenario={(context.parameters["scenario"] ?? "read") as CollaborationScenario}
      >
        <Story />
      </CollaborationStoryProviders>
    ),
  ],
} satisfies Meta<typeof OperationalScopeView>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Viewer: Story = {
  play: async ({ canvas }) => {
    await expect(await canvas.findByText("Ver actividades")).toBeVisible();
    await expect(
      canvas.queryByRole("button", { name: "Agregar colaborador" }),
    ).not.toBeInTheDocument();
  },
};
export const Editor: Story = {
  parameters: { scenario: "edit" },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText("Actualizar actividades")).toBeVisible();
  },
};
export const Organizer: Story = {
  parameters: { scenario: "manage" },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole("button", { name: "Agregar colaborador" })).toBeVisible();
  },
};
export const DelegationRevoked: Story = {
  parameters: { scenario: "revocation" },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(await canvas.findByRole("button", { name: "Retirar a Ana Pérez" }));
    await userEvent.click(canvas.getByRole("button", { name: "Confirmar retirada de Ana Pérez" }));
    await expect(await canvas.findByText("Ver actividades")).toBeVisible();
    await expect(
      canvas.queryByRole("button", { name: "Agregar colaborador" }),
    ).not.toBeInTheDocument();
  },
};
export const ForeignScope: Story = {
  args: { scope: { type: "activity", id: "foreign" } },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText("Contexto no autorizado")).toBeVisible();
  },
};
export const Archived: Story = {
  parameters: { scenario: "archived" },
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByText("El programa está archivado y no permite modificar colaboradores."),
    ).toBeVisible();
  },
};
