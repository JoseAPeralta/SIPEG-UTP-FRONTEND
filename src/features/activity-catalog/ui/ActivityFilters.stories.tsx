import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, within } from "storybook/test";

import { ActivityFilters } from "./ActivityFilters";

const unitOptions = [
  { id: "fisc", label: "FISC - Facultad de Ingenieria de Sistemas" },
  { id: "fic", label: "FIC - Facultad de Ingenieria Civil" },
];

const meta = {
  args: {
    filteredCount: 12,
    onSortDirectionChange: fn(),
    onTypeFilterChange: fn(),
    onUnitFilterChange: fn(),
    sortDirection: "asc",
    typeFilter: "all",
    unitFilter: "all",
    unitOptions,
  },
  argTypes: {
    onClearFilters: { control: false },
    onProgramFilterChange: { control: false },
    onSearchTermChange: { control: false },
    onSortDirectionChange: { control: false },
    onTypeFilterChange: { control: false },
    onUnitFilterChange: { control: false },
    programOptions: { control: false },
    unitOptions: { control: false },
  },
  component: ActivityFilters,
  parameters: {
    docs: {
      description: {
        component:
          "Filtros base del catalogo. Search, programa y limpiar aparecen solo cuando se proporcionan sus callbacks.",
      },
    },
  },
  title: "Features/Activity Catalog/ActivityFilters",
} satisfies Meta<typeof ActivityFilters>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Public: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.selectOptions(
      canvas.getByRole("combobox", { name: /unidad organizativa/i }),
      "fisc",
    );

    await expect(args.onUnitFilterChange).toHaveBeenCalledWith("fisc");
  },
};

export const Administrative: Story = {
  args: {
    filteredCount: 4,
    onClearFilters: fn(),
    onProgramFilterChange: fn(),
    onSearchTermChange: fn(),
    programFilter: "all",
    programOptions: [{ id: "program-1", label: "Semana de Innovacion Academica" }],
    searchTerm: "",
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.type(canvas.getByRole("textbox", { name: /buscar actividades/i }), "datos");
    await userEvent.click(canvas.getByRole("button", { name: /limpiar filtros/i }));

    await expect(args.onSearchTermChange).toHaveBeenCalled();
    await expect(args.onClearFilters).toHaveBeenCalledOnce();
  },
};
