import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";

import type { PublicActivity } from "@/types/domain";

import { buildPublicActivityRows } from "../model/publicCatalogSelectors";

import { PublicActivityCard } from "./PublicActivityCard";

const baseActivity: PublicActivity = {
  bannerUrl: null,
  capacity: 40,
  classroom: {
    building: "Edificio de Aulas",
    id: "classroom-1",
    name: "Auditorio Roberto Barraza",
  },
  date: "2026-10-14",
  description:
    "Taller practico de levantamiento topografico con drones, con equipos del laboratorio.",
  endTime: "12:00",
  id: "activity-1",
  name: "Taller de Topografia con Drones",
  program: {
    id: "program-fic",
    isDefault: true,
    label: null,
    name: "Programa de Eventos - Facultad de Ingenieria Civil",
  },
  speakers: [
    { firstName: "Ricardo", id: "speaker-1", lastName: "Arosemena" },
    { firstName: "Luisa", id: "speaker-2", lastName: "Fernandez" },
  ],
  startTime: "09:00",
  type: "WORKSHOP",
  unit: {
    backendId: "seed_unit_fic",
    name: "Facultad de Ingenieria Civil",
    type: "FACULTY",
  },
};

function row(overrides: Partial<PublicActivity> = {}) {
  const activities = [{ ...baseActivity, ...overrides }];

  return buildPublicActivityRows({ activities })[0]!;
}

const meta = {
  args: { row: row() },
  component: PublicActivityCard,
  parameters: {
    docs: {
      description: {
        component:
          "Tarjeta de la agenda publica. No acepta banderas de presentacion: el listado publico no expone equipamiento ni inscritos.",
      },
    },
  },
  title: "Features/Activity Catalog/PublicActivityCard",
} satisfies Meta<typeof PublicActivityCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ProgramWithCustomLabel: Story = {
  args: {
    row: row({
      program: {
        id: "program-cit",
        isDefault: false,
        label: "CIT-2026",
        name: "Congreso de Innovacion",
      },
    }),
  },
};

export const WithoutClassroom: Story = {
  args: { row: row({ classroom: null }) },
};

export const WithoutDescriptionOrSpeakers: Story = {
  args: { row: row({ description: null, speakers: [] }) },
};

export const FromAnUnknownUnit: Story = {
  args: {
    row: row({
      unit: { backendId: "seed_unit_nueva", name: "Facultad de InnovacionNueva", type: "FACULTY" },
    }),
  },
  parameters: {
    docs: {
      description: {
        story:
          "Una unidad fuera del registro institucional se sigue mostrando, con el color por defecto y el nombre tal cual llega del API.",
      },
    },
  },
};

export const ExpandsALongDescription: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByRole("button", { name: /leer mas/i }));

    await expect(canvas.getByRole("button", { name: /leer menos/i })).toBeInTheDocument();
    await expect(canvas.queryByText(/...$/)).toBeNull();
  },
};
