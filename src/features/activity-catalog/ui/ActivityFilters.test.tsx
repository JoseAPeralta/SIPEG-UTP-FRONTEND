import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "@/test/render";

import { ActivityFilters } from "./ActivityFilters";

const unitOptions = [
  { id: "fisc", label: "FISC - Facultad de Ingenieria de Sistemas" },
  { id: "fic", label: "FIC - Facultad de Ingenieria Civil" },
];

const programOptions = [{ id: "program-1", label: "Semana de Innovacion Academica" }];

describe("ActivityFilters", () => {
  it("should render the public filters without search, program or clear actions", () => {
    renderWithProviders(
      <ActivityFilters
        filteredCount={12}
        onSortDirectionChange={vi.fn()}
        onTypeFilterChange={vi.fn()}
        onUnitFilterChange={vi.fn()}
        sortDirection="desc"
        typeFilter="all"
        unitFilter="all"
        unitOptions={unitOptions}
      />,
    );

    expect(screen.getByText("12 resultados")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: /unidad organizativa/i })).toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: /buscar actividades/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /limpiar filtros/i })).not.toBeInTheDocument();
  });

  it("should render the administrative filters when handlers are provided", () => {
    renderWithProviders(
      <ActivityFilters
        filteredCount={4}
        onClearFilters={vi.fn()}
        onProgramFilterChange={vi.fn()}
        onSearchTermChange={vi.fn()}
        onSortDirectionChange={vi.fn()}
        onTypeFilterChange={vi.fn()}
        onUnitFilterChange={vi.fn()}
        programFilter="all"
        programOptions={programOptions}
        searchTerm=""
        sortDirection="asc"
        typeFilter="all"
        unitFilter="all"
        unitOptions={unitOptions}
      />,
    );

    expect(screen.getByRole("textbox", { name: /buscar actividades/i })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: /programa de eventos/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /limpiar filtros/i })).toBeInTheDocument();
  });

  it("should list the activity types in the expected order", () => {
    renderWithProviders(
      <ActivityFilters
        filteredCount={12}
        onSortDirectionChange={vi.fn()}
        onTypeFilterChange={vi.fn()}
        onUnitFilterChange={vi.fn()}
        sortDirection="desc"
        typeFilter="all"
        unitFilter="all"
        unitOptions={unitOptions}
      />,
    );

    const options = within(
      screen.getByRole("combobox", { name: /tipo de actividad/i }),
    ).getAllByRole("option");

    expect(options.map((option) => option.textContent)).toEqual([
      "Todos los tipos",
      "Charla",
      "Conferencia",
      "Seminario",
      "Taller",
      "Curso",
      "Panel",
      "Competencia",
      "Otro",
    ]);
  });

  it("should report filter changes", async () => {
    const user = userEvent.setup();
    const onUnitFilterChange = vi.fn();
    const onTypeFilterChange = vi.fn();
    const onSortDirectionChange = vi.fn();

    renderWithProviders(
      <ActivityFilters
        filteredCount={12}
        onSortDirectionChange={onSortDirectionChange}
        onTypeFilterChange={onTypeFilterChange}
        onUnitFilterChange={onUnitFilterChange}
        sortDirection="desc"
        typeFilter="all"
        unitFilter="all"
        unitOptions={unitOptions}
      />,
    );

    await user.selectOptions(
      screen.getByRole("combobox", { name: /unidad organizativa/i }),
      "fisc",
    );
    await user.selectOptions(
      screen.getByRole("combobox", { name: /tipo de actividad/i }),
      "WORKSHOP",
    );
    await user.selectOptions(screen.getByRole("combobox", { name: /orden/i }), "asc");

    expect(onUnitFilterChange).toHaveBeenCalledWith("fisc");
    expect(onTypeFilterChange).toHaveBeenCalledWith("WORKSHOP");
    expect(onSortDirectionChange).toHaveBeenCalledWith("asc");
  });
});
