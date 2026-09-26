import type { Meta, StoryObj } from "@storybook/react-vite";

import { MetricCard } from "./MetricCard";

const meta = {
  args: {
    appearance: "standard",
    detail: "Participantes que completaron el registro.",
    label: "Inscripciones",
    tone: "primary",
    value: "248",
  },
  component: MetricCard,
  parameters: {
    docs: {
      description: {
        component:
          "Muestra una metrica con jerarquias standard, operational o summary. Tone solo afecta a standard y por defecto es neutral.",
      },
    },
  },
  title: "Shared/UI/MetricCard",
} satisfies Meta<typeof MetricCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {};

export const Success: Story = {
  args: {
    tone: "success",
  },
};

export const Warning: Story = {
  args: {
    tone: "warning",
  },
};

export const Neutral: Story = {
  args: {
    tone: "neutral",
  },
};

export const Operational: Story = {
  args: {
    appearance: "operational",
    detail: "Personas con asistencia confirmada.",
    label: "Asistencias",
    value: "186",
  },
};

export const Summary: Story = {
  args: {
    appearance: "summary",
    detail: "Actividades con aula, horario y expositores.",
    label: "actividades",
    value: "32",
  },
};
