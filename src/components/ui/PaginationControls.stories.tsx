import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent } from "storybook/test";

import { PaginationControls } from "./PaginationControls";

const meta = {
  args: {
    currentPage: 2,
    itemLabel: "actividades",
    onPageChange: fn(),
    pageCount: 5,
    pageSize: 10,
    totalItems: 48,
  },
  argTypes: {
    onPageChange: { control: false },
  },
  component: PaginationControls,
  parameters: {
    docs: {
      description: {
        component:
          "Navegacion paginada acotada. Muestra el rango visible de la pagina actual y se oculta cuando no hay elementos. Normaliza paginas fuera de rango antes de emitir cambios.",
      },
    },
  },
  title: "Shared/UI/PaginationControls",
} satisfies Meta<typeof PaginationControls>;

export default meta;
type Story = StoryObj<typeof meta>;

export const MiddlePage: Story = {
  play: async ({ args, canvas }) => {
    await expect(canvas.getByText(/11–20 de 48 actividades/i)).toBeInTheDocument();
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
    pageSize: 8,
    totalItems: 8,
  },
};
