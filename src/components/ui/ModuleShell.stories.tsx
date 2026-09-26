import { Button, Text } from "@chakra-ui/react";
import type { Meta, StoryObj } from "@storybook/react-vite";

import { ModuleShell } from "./ModuleShell";
import { Surface } from "./Surface";

const meta = {
  args: {
    children: (
      <Surface padding="normal">
        <Text color="text.muted">Contenido del modulo</Text>
      </Surface>
    ),
    description:
      "Consulta indicadores y administra las acciones principales de este espacio de trabajo.",
    headingLabel: "Gestion academica",
    title: "Resumen operativo",
  },
  argTypes: {
    actions: { control: false },
    children: { control: false },
  },
  component: ModuleShell,
  parameters: {
    docs: {
      description: {
        component:
          "Encabezado compartido para vistas de ruta. Compone titulo, etiqueta de encabezado, descripcion, acciones opcionales y contenido.",
      },
    },
  },
  title: "Shared/UI/ModuleShell",
} satisfies Meta<typeof ModuleShell>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithActions: Story = {
  args: {
    actions: (
      <Button colorPalette="terracotta" rounded="full">
        Crear actividad
      </Button>
    ),
  },
};
