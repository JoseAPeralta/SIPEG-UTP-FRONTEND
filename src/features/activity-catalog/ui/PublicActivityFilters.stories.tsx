import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, within } from "storybook/test";

import type { PublicActivity } from "@/types/domain";

import { buildPublicActivityRows } from "../model/publicCatalogSelectors";

import { PublicActivityFilters } from "./PublicActivityFilters";

function rowsFor(units: string[]): ReturnType<typeof buildPublicActivityRows> {
  const activities: PublicActivity[] = units.map((name, index) => ({
    bannerUrl: null,
    capacity: null,
    classroom: null,
    date: "2026-10-14",
    description: null,
    endTime: "12:00",
    id: `activity-${index}`,
    name: `Actividad ${index}`,
    program: { id: "p", isDefault: true, label: null, name: "Programa de Eventos - Unidad" },
    speakers: [],
    startTime: "09:00",
    type: "TALK",
    unit: { backendId: `unit-${index}`, name, type: "FACULTY" },
  }));

  return buildPublicActivityRows({ activities });
}

const rows = rowsFor([
  "Facultad de Ingenieria Civil",
  "Facultad de Ingenieria de Sistemas Computacionales",
]);

const meta = {
  args: {
    filteredCount: 12,
    onSortDirectionChange: fn(),
    onTypeFilterChange: fn(),
    onUnitFilterChange: fn(),
    rows,
    sortDirection: "desc",
    typeFilter: "all",
    unitFilter: "all",
  },
  argTypes: {
    onSortDirectionChange: { control: false },
    onTypeFilterChange: { control: false },
    onUnitFilterChange: { control: false },
    rows: { control: false },
  },
  component: PublicActivityFilters,
  parameters: {
    docs: {
      description: {
        component:
          "Filtros de la agenda publica. Las unidades salen del registro institucional y los tipos de las etiquetas de dominio: ninguno se descarga.",
      },
    },
  },
  title: "Features/Activity Catalog/PublicActivityFilters",
} satisfies Meta<typeof PublicActivityFilters>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SelectsAnOrganizationalUnit: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.selectOptions(
      canvas.getByRole("combobox", { name: /unidad organizativa/i }),
      "FIC",
    );

    await expect(args.onUnitFilterChange).toHaveBeenCalledWith("FIC");
  },
};

export const SelectsAnActivityType: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.selectOptions(
      canvas.getByRole("combobox", { name: /tipo de actividad/i }),
      "WORKSHOP",
    );

    await expect(args.onTypeFilterChange).toHaveBeenCalledWith("WORKSHOP");
  },
};

export const ChangesTheSortOrder: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.selectOptions(canvas.getByRole("combobox", { name: /orden/i }), "asc");

    await expect(args.onSortDirectionChange).toHaveBeenCalledWith("asc");
  },
};

export const OffersOnlyUnitsPresentInTheAgenda: Story = {
  args: {
    filteredCount: 3,
    rows: rowsFor(["Facultad de Ingenieria Electrica"]),
  },
  parameters: {
    docs: {
      description: {
        story:
          "Solo se ofrece la unidad que alguna actividad respeta: un filtro que no acorta la lista no se presenta.",
      },
    },
  },
  play: async ({ canvas }) => {
    // El alcance es el desplegable de unidades: la pagina tiene otros con
    // opciones propias, asi que una consulta global compararia listas distintas.
    const options = within(canvas.getByRole("combobox", { name: /unidad organizativa/i }));

    await expect(options.getAllByRole("option").map((option) => option.textContent)).toEqual([
      "Todas las unidades",
      "FIE - Facultad de Ingeniería Eléctrica",
    ]);
  },
};
