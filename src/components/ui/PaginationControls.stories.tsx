import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, within } from "storybook/test";

import { PaginationControls } from "./PaginationControls";

const meta = {
  args: {
    currentPage: 2,
    itemLabel: "actividades",
    onPageChange: fn(),
    pageCount: 5,
    totalItems: 48,
    visibleItems: 10,
  },
  argTypes: {
    onPageChange: { control: false },
  },
  component: PaginationControls,
  parameters: {
    docs: {
      description: {
        component:
          "Navegacion paginada acotada. Normaliza paginas fuera de rango antes de emitir cambios.",
      },
    },
  },
  title: "Shared/UI/PaginationControls",
} satisfies Meta<typeof PaginationControls>;

export default meta;
type Story = StoryObj<typeof meta>;

export const MiddlePage: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByRole("button", { name: "4" }));

    await expect(args.onPageChange).toHaveBeenCalledWith(4);
  },
};

export const FirstPage: Story = {
  args: {
    currentPage: 1,
  },
};

export const OnlyPage: Story = {
  args: {
    currentPage: 1,
    pageCount: 1,
    totalItems: 8,
    visibleItems: 8,
  },
};
