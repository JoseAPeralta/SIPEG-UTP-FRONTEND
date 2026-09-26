import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, within } from "storybook/test";

import {
  createActivity,
  createClassroom,
  createEventProgram,
  createOrganizationalUnit,
} from "@/test/factories";

import { ActivityCard } from "./ActivityCard";

const activity = createActivity({
  description:
    "Una sesion practica para explorar herramientas digitales aplicadas a la docencia universitaria.",
  speakers: [{ firstName: "Ana", id: "speaker-ana", lastName: "Perez" }],
});

const meta = {
  args: {
    activity,
    classroom: createClassroom({ name: "Auditorio Roberto Barraza" }),
    program: createEventProgram({ label: "Semana de innovacion" }),
    unit: createOrganizationalUnit({ code: "FISC" }),
  },
  argTypes: {
    activity: { control: false },
    classroom: { control: false },
    onSelect: { control: false },
    program: { control: false },
    unit: { control: false },
  },
  component: ActivityCard,
  parameters: {
    docs: {
      description: {
        component:
          "Tarjeta de actividad para catalogos publicos, resumenes con inscritos y seleccion de contexto administrativo.",
      },
    },
  },
  title: "Features/Activity Catalog/ActivityCard",
} satisfies Meta<typeof ActivityCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Public: Story = {};

export const WithEnrollmentCount: Story = {
  args: {
    showEnrolledCount: true,
  },
};

export const Selectable: Story = {
  args: {
    onSelect: fn(),
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(
      canvas.getByRole("button", { name: /usar actividad de prueba en panel/i }),
    );

    await expect(args.onSelect).toHaveBeenCalledWith(args.activity);
  },
};

export const Selected: Story = {
  args: {
    isSelected: true,
    onSelect: fn(),
  },
};

export const LongDescription: Story = {
  args: {
    activity: createActivity({ description: "Detalle extenso de la actividad. ".repeat(12) }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByRole("button", { name: /leer mas/i }));

    await expect(canvas.getByRole("button", { name: /leer menos/i })).toBeVisible();
  },
};
