import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, within } from "storybook/test";

import { createEventProgram, createOrganizationalUnit } from "@/test/factories";

import { EventProgramCard } from "./EventProgramCard";

const summary = {
  activityCount: 8,
  enrolledCount: 248,
  program: createEventProgram({ label: "Semana de innovacion" }),
  unit: createOrganizationalUnit({ code: "FISC" }),
};

const meta = {
  args: {
    summary,
  },
  argTypes: {
    onSelect: { control: false },
    summary: { control: false },
  },
  component: EventProgramCard,
  parameters: {
    docs: {
      description: {
        component:
          "Resumen de un programa de eventos. La accion de contexto solo aparece al proporcionar onSelect.",
      },
    },
  },
  title: "Features/Activity Catalog/EventProgramCard",
} satisfies Meta<typeof EventProgramCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Summary: Story = {};

export const Selectable: Story = {
  args: {
    onSelect: fn(),
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(
      canvas.getByRole("button", { name: /usar semana de innovacion academica en panel/i }),
    );

    await expect(args.onSelect).toHaveBeenCalledWith(args.summary.program);
  },
};

export const Selected: Story = {
  args: {
    isSelected: true,
    onSelect: fn(),
  },
};
