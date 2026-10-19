import type { Meta, StoryObj } from "@storybook/react-vite";
import { Stack } from "@chakra-ui/react";
import { expect, fn, userEvent, within } from "storybook/test";

import {
  createActivitySummary,
  createClassroom,
  createEventProgram,
  createOrganizationalUnit,
} from "@/test/factories";

import { ActivityCard } from "./ActivityCard";

const activity = createActivitySummary({
  description:
    "Una sesion practica para explorar herramientas digitales aplicadas a la docencia universitaria.",
  speakers: [{ firstName: "Ana", id: "speaker-ana", lastName: "Perez" }],
});

const newTypeActivities = [
  createActivitySummary({
    description: "Exposicion magistral de un experto invitado ante un auditorio amplio.",
    id: "activity-conference",
    name: "Conferencia magistral: universidad y sociedad",
    type: "CONFERENCE",
  }),
  createActivitySummary({
    description: "Especialistas debaten un tema guiados por un moderador y el publico.",
    id: "activity-panel",
    name: "Panel: futuro de la formacion en ingenieria",
    type: "PANEL",
  }),
  createActivitySummary({
    description: "Formacion estructurada de varias sesiones con objetivos y evaluacion.",
    id: "activity-course",
    name: "Curso de fundamentos de automatizacion industrial",
    type: "COURSE",
  }),
  createActivitySummary({
    description: "Reto con reglas, jueces y ranking entre equipos participantes.",
    id: "activity-competition",
    name: "Competencia de robotica de rescate",
    type: "COMPETITION",
  }),
];

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
          "Tarjeta de resumen de una actividad para el catalogo administrativo. El listado no expone inscritos ni equipamiento: la tarjeta enlaza al detalle, que si los consulta al abrirse.",
      },
    },
  },
  title: "Features/Activity Catalog/ActivityCard",
} satisfies Meta<typeof ActivityCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Public: Story = {
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("link", { name: /ver detalle de actividad de prueba/i }),
    ).toHaveAttribute("href", "/admin/actividades/activity-1");
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
    activity: createActivitySummary({
      description: "Detalle extenso de la actividad. ".repeat(12),
    }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByRole("button", { name: /leer mas/i }));

    await expect(canvas.getByRole("button", { name: /leer menos/i })).toBeVisible();
  },
};

export const NewActivityTypes: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <Stack gap="6">
      {newTypeActivities.map((newTypeActivity) => (
        <ActivityCard
          activity={newTypeActivity}
          classroom={createClassroom({ name: "Auditorio Roberto Barraza" })}
          key={newTypeActivity.id}
          program={createEventProgram({ label: "Semana de innovacion" })}
          unit={createOrganizationalUnit({ code: "FISC" })}
        />
      ))}
    </Stack>
  ),
};
