import type { Meta, StoryObj } from "@storybook/react-vite";

import { SectionHeader } from "./SectionHeader";

const meta = {
  args: {
    headingLabel: "Agenda institucional",
    id: "section-title",
    title: "Programas de eventos",
  },
  component: SectionHeader,
  parameters: {
    docs: {
      description: {
        component:
          'Encabezado `h2` para secciones internas de un modulo. Admite una etiqueta de encabezado, descripcion y una linea de estado con `role="status"`.',
      },
    },
  },
  title: "Shared/UI/SectionHeader",
} satisfies Meta<typeof SectionHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithHeadingLabel: Story = {};

export const WithDescription: Story = {
  args: {
    description: "Programas que agrupan la agenda institucional.",
    headingLabel: undefined,
  },
};

export const WithStatus: Story = {
  args: {
    headingLabel: undefined,
    status: "Contexto activo: Semana de innovacion academica",
  },
};
