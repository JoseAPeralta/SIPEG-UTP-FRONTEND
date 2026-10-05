import { Heading, Text } from "@chakra-ui/react";
import type { Meta, StoryObj } from "@storybook/react-vite";

import { Surface } from "./Surface";

const meta = {
  args: {
    children: (
      <>
        <Heading as="h3" fontFamily="heading" fontSize="xl">
          Programas de eventos
        </Heading>
        <Text color="text.muted" mt={2}>
          Agrupa actividades por programa con borde, radio y elevacion consistentes.
        </Text>
      </>
    ),
    elevation: "flat",
    padding: "normal",
    radius: "panel",
  },
  argTypes: {
    children: { control: false },
  },
  component: Surface,
  parameters: {
    docs: {
      description: {
        component:
          "Panel base de SIPEG: aplica superficie, borde, radio, padding y sombras semanticas. Seleccione `elevation`, `padding`, `radius`, `selected` e `interactive` en lugar de repetir props de estilo.",
      },
    },
  },
  title: "Shared/UI/Surface",
} satisfies Meta<typeof Surface>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Panel: Story = {};

export const Raised: Story = {
  args: {
    elevation: "raised",
  },
};

export const Overlay: Story = {
  args: {
    elevation: "overlay",
  },
};

export const Selected: Story = {
  args: {
    selected: true,
  },
};

export const Interactive: Story = {
  args: {
    interactive: true,
    padding: "normal",
  },
};

export const ControlRadius: Story = {
  args: {
    radius: "control",
  },
};
