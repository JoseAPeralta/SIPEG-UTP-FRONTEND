import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { collaborationStorySession } from "@/test/collaborationStories";
import { CollaborationStoryProviders } from "@/test/CollaborationStoryProviders";
import { OperationsLayout } from "./OperationsLayout";
const meta = {
  title: "Layout/OperationsLayout",
  component: OperationsLayout,
  parameters: { layout: "fullscreen" },
  beforeEach: () => collaborationStorySession(),
  decorators: [
    (Story) => (
      <CollaborationStoryProviders scenario="read">
        <Story />
      </CollaborationStoryProviders>
    ),
  ],
} satisfies Meta<typeof OperationsLayout>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Collaborator: Story = {
  play: async ({ canvas }) => {
    await canvas.findByRole("option", { name: "Actividad: Taller de colaboración académica" });
    await expect(canvas.getByLabelText("Contexto operativo")).toBeEnabled();
    await expect(
      canvas.getByRole("navigation", { name: "Navegación de operaciones" }),
    ).toBeVisible();
  },
};
