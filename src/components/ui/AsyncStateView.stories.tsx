import { Button } from "@chakra-ui/react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, within } from "storybook/test";

import { AsyncStateView } from "./AsyncStateView";

const meta = {
  args: {
    children: <Button>Continuar</Button>,
    error: null,
    isLoading: false,
  },
  argTypes: {
    children: { control: false },
    error: { control: false },
    onRetry: { control: false },
  },
  component: AsyncStateView,
  parameters: {
    docs: {
      description: {
        component:
          "Resuelve estados de carga, error y contenido listo. La carga tiene precedencia sobre el error.",
      },
    },
  },
  title: "Shared/UI/AsyncStateView",
} satisfies Meta<typeof AsyncStateView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Ready: Story = {};

export const Loading: Story = {
  args: {
    isLoading: true,
  },
};

export const ErrorWithoutRetry: Story = {
  args: {
    error: new Error("No fue posible conectar con el servicio."),
  },
};

export const ErrorWithRetry: Story = {
  args: {
    error: new Error("No fue posible conectar con el servicio."),
    onRetry: fn(),
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByRole("button", { name: /reintentar/i }));

    await expect(args.onRetry).toHaveBeenCalledOnce();
  },
};
