import { screen, within } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { createPublicActivity } from "@/test/factories";
import { renderWithProviders } from "@/test/render";
import { setupUser } from "@/test/user";

import { buildPublicActivityRows } from "../model/publicCatalogSelectors";

import { PublicActivityFilters, type PublicActivityFiltersProps } from "./PublicActivityFilters";

const rows = buildPublicActivityRows({
  activities: [
    createPublicActivity({ id: "fic-1" }),
    createPublicActivity({
      id: "fisc-2",
      unit: {
        backendId: "fisc",
        name: "Facultad de Ingenieria de Sistemas Computacionales",
        type: "FACULTY",
      },
    }),
  ],
});

const programOptions = [{ id: "program-1", label: "Semana de innovacion" }];

/**
 * El componente es controlado: sin un padre que actualice `searchTerm`, cada
 * pulsacion vuelve a escribir sobre el valor anterior. El arnes reproduce el
 * uso real (el hook conserva el estado) para poder teclear una frase completa.
 */
function StatefulSearchFilters({ onChange }: { onChange: (value: string) => void }) {
  const [searchTerm, setSearchTerm] = useState("");

  return (
    <PublicActivityFilters
      filteredCount={2}
      onClearFilters={vi.fn()}
      onPeriodChange={vi.fn()}
      onProgramFilterChange={vi.fn()}
      onSearchTermChange={(value) => {
        setSearchTerm(value);
        onChange(value);
      }}
      onSortDirectionChange={vi.fn()}
      onTypeFilterChange={vi.fn()}
      onUnitFilterChange={vi.fn()}
      onUnitTypeFilterChange={vi.fn()}
      period="available"
      programFilter="all"
      programOptions={programOptions}
      rows={rows}
      searchTerm={searchTerm}
      sortDirection="asc"
      typeFilter="all"
      unitFilter="all"
      unitTypeFilter="all"
    />
  );
}

function renderFilters(overrides: Partial<PublicActivityFiltersProps> = {}) {
  const handlers = {
    onClearFilters: vi.fn(),
    onPeriodChange: vi.fn(),
    onProgramFilterChange: vi.fn(),
    onSearchTermChange: vi.fn(),
    onSortDirectionChange: vi.fn(),
    onTypeFilterChange: vi.fn(),
    onUnitFilterChange: vi.fn(),
    onUnitTypeFilterChange: vi.fn(),
  };

  renderWithProviders(
    <PublicActivityFilters
      filteredCount={2}
      period="available"
      programFilter="all"
      programOptions={programOptions}
      rows={rows}
      searchTerm=""
      sortDirection="asc"
      typeFilter="all"
      unitFilter="all"
      unitTypeFilter="all"
      {...handlers}
      {...overrides}
    />,
  );

  return handlers;
}

describe("PublicActivityFilters", () => {
  it("should label every control and reflect the current state", () => {
    renderFilters({
      period: "past",
      programFilter: "program-1",
      searchTerm: "drones",
      sortDirection: "desc",
      typeFilter: "WORKSHOP",
      unitFilter: "FISC",
      unitTypeFilter: "SUBDIRECTORATE",
    });

    expect(screen.getByText("2 resultados")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Periodo" })).toHaveValue("past");
    expect(screen.getByRole("textbox", { name: "Buscar actividades" })).toHaveValue("drones");
    expect(screen.getByRole("combobox", { name: "Tipo de unidad" })).toHaveValue("SUBDIRECTORATE");
    expect(screen.getByRole("combobox", { name: "Programa" })).toHaveValue("program-1");
    expect(screen.getByRole("combobox", { name: "Unidad organizativa" })).toHaveValue("FISC");
    expect(screen.getByRole("combobox", { name: "Tipo de actividad" })).toHaveValue("WORKSHOP");
    expect(screen.getByRole("combobox", { name: "Orden" })).toHaveValue("desc");
    expect(screen.getByRole("button", { name: "Limpiar filtros" })).toBeInTheDocument();
  });

  it("should localize the period and unit type options", () => {
    renderFilters();

    const periods = within(screen.getByRole("combobox", { name: "Periodo" })).getAllByRole(
      "option",
    );
    const unitTypes = within(screen.getByRole("combobox", { name: "Tipo de unidad" })).getAllByRole(
      "option",
    );

    expect(periods.map((option) => option.textContent)).toEqual([
      "Disponibles",
      "Próximas",
      "Pasadas",
      "Todas",
    ]);
    expect(unitTypes.map((option) => option.textContent)).toEqual([
      "Todos los tipos",
      "Facultad",
      "Subdirección",
    ]);
  });

  it("should only offer the units present in the agenda", () => {
    renderFilters({
      rows: buildPublicActivityRows({ activities: [createPublicActivity({ id: "fic-1" })] }),
    });

    const units = within(
      screen.getByRole("combobox", { name: "Unidad organizativa" }),
    ).getAllByRole("option");

    expect(units.map((option) => option.textContent)).toEqual([
      "Todas las unidades",
      "FIC - Facultad de Ingeniería Civil",
    ]);
  });

  it("should cap the search term length", () => {
    renderFilters();

    expect(screen.getByRole("textbox", { name: "Buscar actividades" })).toHaveAttribute(
      "maxlength",
      "80",
    );
  });

  it("should report every filter change", async () => {
    const user = setupUser();
    const handlers = renderFilters();

    await user.selectOptions(screen.getByRole("combobox", { name: "Periodo" }), "past");
    await user.selectOptions(screen.getByRole("combobox", { name: "Tipo de unidad" }), "FACULTY");
    await user.selectOptions(screen.getByRole("combobox", { name: "Programa" }), "program-1");
    await user.selectOptions(screen.getByRole("combobox", { name: "Unidad organizativa" }), "FISC");
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Tipo de actividad" }),
      "WORKSHOP",
    );
    await user.selectOptions(screen.getByRole("combobox", { name: "Orden" }), "desc");

    expect(handlers.onPeriodChange).toHaveBeenCalledWith("past");
    expect(handlers.onUnitTypeFilterChange).toHaveBeenCalledWith("FACULTY");
    expect(handlers.onProgramFilterChange).toHaveBeenCalledWith("program-1");
    expect(handlers.onUnitFilterChange).toHaveBeenCalledWith("FISC");
    expect(handlers.onTypeFilterChange).toHaveBeenCalledWith("WORKSHOP");
    expect(handlers.onSortDirectionChange).toHaveBeenCalledWith("desc");
  });

  it("should report the search term as it is typed", async () => {
    const user = setupUser();
    const onSearchTermChange = vi.fn();

    renderWithProviders(<StatefulSearchFilters onChange={onSearchTermChange} />);

    await user.type(screen.getByRole("textbox", { name: "Buscar actividades" }), "drones");

    expect(onSearchTermChange).toHaveBeenLastCalledWith("drones");
    expect(screen.getByRole("textbox", { name: "Buscar actividades" })).toHaveValue("drones");
  });

  it("should clear every filter on request", async () => {
    const user = setupUser();
    const handlers = renderFilters({ searchTerm: "drones", typeFilter: "WORKSHOP" });

    await user.click(screen.getByRole("button", { name: "Limpiar filtros" }));

    expect(handlers.onClearFilters).toHaveBeenCalledTimes(1);
  });
});
