import { Button } from "@chakra-ui/react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, within } from "storybook/test";

import { FeedbackState } from "./FeedbackState";

const onRetry = fn();

const meta = {
  args: {
    description: "Cuando haya asistencia confirmada, los certificados apareceran aqui.",
    title: "No hay certificados para este contexto",
  },
  argTypes: {
    action: { control: false },
  },
  component: FeedbackState,
  parameters: {
    docs: {
      description: {
        component:
          'Explica un estado vacio, bloqueado o fallido. Con `role="alert"` anuncia el error y puede ofrecer una accion de recuperacion.',
      },
    },
  },
  title: "Shared/UI/FeedbackState",
} satisfies Meta<typeof FeedbackState>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {};

export const ProminentTitle: Story = {
  args: {
    titleSize: "lg",
  },
};

export const ErrorWithAction: Story = {
  args: {
    action: (
      <Button colorPalette="terracotta" onClick={onRetry}>
        Reintentar
      </Button>
    ),
    description: "No fue posible conectar con el servicio.",
    role: "alert",
    title: "No se pudo cargar la informacion",
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByRole("alert")).toHaveTextContent(/no fue posible conectar/i);

    await userEvent.click(canvas.getByRole("button", { name: /reintentar/i }));

    await expect(onRetry).toHaveBeenCalledOnce();
  },
};
