import { Box, Heading, Text } from "@chakra-ui/react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent } from "storybook/test";

import { SkipLink } from "./SkipLink";

const meta = {
  component: SkipLink,
  parameters: {
    docs: {
      description: {
        component:
          "Primer enlace enfocable del documento. Se posiciona fuera de pantalla hasta recibir foco y apunta al contenedor que la pagina debe exponer como `main-content`.",
      },
    },
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  title: "Layout/SkipLink",
} satisfies Meta<typeof SkipLink>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <>
      <SkipLink />
      <Box as="main" id="main-content" p={10} tabIndex={-1}>
        <Heading color="text.default" fontFamily="heading" size="lg">
          Contenido principal
        </Heading>
        <Text color="text.muted" mt={2}>
          El destino del enlace existe para recibir el foco del teclado.
        </Text>
      </Box>
    </>
  ),
  play: async ({ canvas }) => {
    const skipLink = canvas.getByRole("link", { name: /saltar al contenido/i });

    await expect(skipLink).toHaveAttribute("href", "#main-content");
    await expect(skipLink).not.toHaveFocus();

    await userEvent.tab();

    await expect(skipLink).toHaveFocus();
  },
};
