import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { collaborationStorySession, type CollaborationScenario } from "@/test/collaborationStories";
import { CollaborationStoryProviders } from "@/test/CollaborationStoryProviders";
import { OperationalScopesView } from "./OperationalScopesView";
const meta = {
  title: "Features/Collaboration/OperationalScopesView",
  component: OperationalScopesView,
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
} satisfies Meta<typeof OperationalScopesView>;
export default meta;
type Story = StoryObj<typeof meta>;
export const PrivateScope: Story = {
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByRole("link", { name: "Abrir Taller de colaboración académica" }),
    ).toHaveAttribute("href", "/operaciones/actividades/story-activity");
  },
};
export const Empty: Story = {
  parameters: { scenario: "empty" },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText("Sin contextos de trabajo")).toBeVisible();
  },
};
export const Error: Story = {
  parameters: { scenario: "error" },
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByText("No se pudieron consultar sus contextos de trabajo."),
    ).toBeVisible();
  },
};
export const Loading: Story = { parameters: { scenario: "loading" } };
