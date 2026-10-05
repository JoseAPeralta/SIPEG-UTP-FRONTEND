import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { collaborationStorySession } from "@/test/collaborationStories";
import { CollaborationStoryProviders } from "@/test/CollaborationStoryProviders";
import { OperationalMenuLink } from "./OperationalMenuLink";
const meta = {
  title: "Features/Collaboration/OperationalMenuLink",
  component: OperationalMenuLink,
  beforeEach: () => collaborationStorySession(),
  decorators: [
    (Story) => (
      <CollaborationStoryProviders scenario="read">
        <Story />
      </CollaborationStoryProviders>
    ),
  ],
} satisfies Meta<typeof OperationalMenuLink>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Collaborator: Story = {
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole("link", { name: "Mis operaciones" })).toHaveAttribute(
      "href",
      "/operaciones",
    );
  },
};
