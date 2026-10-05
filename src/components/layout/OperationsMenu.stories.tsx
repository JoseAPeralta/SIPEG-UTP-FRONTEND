import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent } from "storybook/test";
import { collaborationStorySession } from "@/test/collaborationStories";
import { CollaborationStoryProviders } from "@/test/CollaborationStoryProviders";
import { OperationsMenu } from "./OperationsMenu";
const meta = {
  title: "Layout/OperationsMenu",
  component: OperationsMenu,
  beforeEach: () => collaborationStorySession(),
  decorators: [
    (Story) => (
      <CollaborationStoryProviders scenario="read">
        <Story />
      </CollaborationStoryProviders>
    ),
  ],
} satisfies Meta<typeof OperationsMenu>;
export default meta;
type Story = StoryObj<typeof meta>;
export const SelectScope: Story = {
  play: async ({ canvas }) => {
    const select = await canvas.findByLabelText("Contexto operativo");
    await canvas.findByRole("option", { name: "Actividad: Taller de colaboración académica" });
    await userEvent.selectOptions(select, "/operaciones/actividades/story-activity");
    await expect(select).toHaveValue("/operaciones/actividades/story-activity");
  },
};
