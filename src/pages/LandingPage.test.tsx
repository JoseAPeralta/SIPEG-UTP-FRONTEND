import { screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { createAppAdapters, type AppAdapters } from "@/app/adapters";
import { useUnitPreferenceStore } from "@/store/unitPreference";
import { createPublicActivity } from "@/test/factories";
import { renderWithProviders } from "@/test/render";
import { setupUser } from "@/test/user";
import type { PublicActivity } from "@/types/domain";

import LandingPage from "./LandingPage";

function buildCatalog(): PublicActivity[] {
  return [
    ...Array.from({ length: 12 }, (_, index) =>
      createPublicActivity({
        date: `2026-10-${String(index + 1).padStart(2, "0")}`,
        id: `programada-${index + 1}`,
        name: `Actividad programada ${index + 1}`,
      }),
    ),
    createPublicActivity({
      date: "2026-10-20",
      id: "en-curso",
      name: "Actividad en curso",
      status: "ONGOING",
    }),
    createPublicActivity({
      date: "2026-09-10",
      id: "completada-1",
      name: "Actividad completada uno",
      status: "COMPLETED",
    }),
    createPublicActivity({
      date: "2026-09-12",
      id: "completada-2",
      name: "Actividad completada dos",
      status: "COMPLETED",
    }),
  ];
}

const targetProgram = {
  id: "p-target",
  isDefault: false,
  label: "Programa Objetivo",
  name: "Programa Objetivo",
} as const;

const otherProgram = {
  id: "p-other",
  isDefault: false,
  label: "Programa Otro",
  name: "Programa Otro",
} as const;

const fiscUnit = {
  backendId: "fisc",
  name: "Facultad de Ingenieria de Sistemas Computacionales",
  type: "FACULTY",
} as const;

const ficUnit = {
  backendId: "fic",
  name: "Facultad de Ingenieria Civil",
  type: "FACULTY",
} as const;

function buildCombinedCatalog(): PublicActivity[] {
  return [
    createPublicActivity({
      id: "match",
      name: "Taller de drones con sensores",
      program: targetProgram,
      type: "WORKSHOP",
      unit: fiscUnit,
    }),
    createPublicActivity({
      id: "other-program",
      name: "Taller de drones agricolas",
      program: otherProgram,
      type: "WORKSHOP",
      unit: fiscUnit,
    }),
    createPublicActivity({
      id: "other-type",
      name: "Charla de drones",
      program: targetProgram,
      type: "SEMINAR",
      unit: fiscUnit,
    }),
    createPublicActivity({
      id: "other-unit",
      name: "Taller de drones remotos",
      program: targetProgram,
      type: "WORKSHOP",
      unit: ficUnit,
    }),
    createPublicActivity({
      id: "other-search",
      name: "Seminario de robotica",
      program: targetProgram,
      type: "WORKSHOP",
      unit: fiscUnit,
    }),
  ];
}

function renderLanding(activities: readonly PublicActivity[]) {
  const adapters: AppAdapters = {
    ...createAppAdapters({ source: "mock" }),
    publicActivityCatalog: {
      getPublicActivity: () => Promise.resolve(null),
      loadPublicActivities: () => Promise.resolve({ activities }),
    },
  };

  renderWithProviders(<LandingPage />, { adapters });

  return adapters;
}

describe("LandingPage", () => {
  beforeEach(() => {
    useUnitPreferenceStore.getState().setSelectedUnitId("all");
  });

  it("should show only the available activities by default and keep the published total", async () => {
    renderLanding(buildCatalog());

    expect(await screen.findByText("Actividad programada 1")).toBeInTheDocument();
    expect(screen.getAllByText("Programada")).toHaveLength(10);
    expect(screen.queryByText("Actividad completada uno")).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "Actividades disponibles" }),
    ).toBeInTheDocument();
    expect(screen.getByText("13 resultados")).toBeInTheDocument();

    // El hero conserva el total publicado, no el resultado filtrado.
    expect(screen.getByText("15")).toBeInTheDocument();
    expect(screen.getByText("actividades publicadas")).toBeInTheDocument();
  });

  it("should show the completed activities when switching to past", async () => {
    const user = setupUser();

    renderLanding(buildCatalog());
    await screen.findByText("Actividad programada 1");

    await user.selectOptions(screen.getByRole("combobox", { name: "Periodo" }), "past");

    expect(await screen.findByText("Actividad completada uno")).toBeInTheDocument();
    expect(screen.getByText("Actividad completada dos")).toBeInTheDocument();
    expect(screen.queryByText("Actividad programada 1")).not.toBeInTheDocument();
    expect(screen.queryByText("Actividad en curso")).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "Actividades pasadas" }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Completada")).toHaveLength(2);
    // Las pasadas se leen de la mas reciente a la mas antigua.
    expect(screen.getAllByText(/^Actividad completada/).map((card) => card.textContent)).toEqual([
      "Actividad completada dos",
      "Actividad completada uno",
    ]);
  });

  it("should combine search, program, type and unit with AND", async () => {
    const user = setupUser();

    renderLanding(buildCombinedCatalog());
    await screen.findByText("Taller de drones con sensores");

    await user.type(screen.getByRole("textbox", { name: "Buscar actividades" }), "drones");
    expect(await screen.findByText("4 resultados")).toBeInTheDocument();
    expect(screen.queryByText("Seminario de robotica")).not.toBeInTheDocument();

    await user.selectOptions(screen.getByRole("combobox", { name: "Programa" }), "p-target");
    expect(await screen.findByText("3 resultados")).toBeInTheDocument();
    expect(screen.queryByText("Taller de drones agricolas")).not.toBeInTheDocument();

    await user.selectOptions(
      screen.getByRole("combobox", { name: "Tipo de actividad" }),
      "WORKSHOP",
    );
    expect(await screen.findByText("2 resultados")).toBeInTheDocument();
    expect(screen.queryByText("Charla de drones")).not.toBeInTheDocument();

    await user.selectOptions(screen.getByRole("combobox", { name: "Unidad organizativa" }), "FISC");
    expect(await screen.findByText("1 resultados")).toBeInTheDocument();
    expect(screen.getByText("Taller de drones con sensores")).toBeInTheDocument();
    expect(screen.queryByText("Taller de drones remotos")).not.toBeInTheDocument();
  });

  it("should return to the first page and keep the pagination over the filtered count", async () => {
    const user = setupUser();

    renderLanding(buildCatalog());
    await screen.findByText("Actividad programada 1");
    expect(screen.getByText("1–10 de 13 actividades")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "2" }));

    expect(await screen.findByText("Actividad programada 11")).toBeInTheDocument();
    expect(screen.getByText("Actividad en curso")).toBeInTheDocument();
    expect(screen.getByText("11–13 de 13 actividades")).toBeInTheDocument();

    await user.selectOptions(screen.getByRole("combobox", { name: "Periodo" }), "past");

    expect(await screen.findByText("1–2 de 2 actividades")).toBeInTheDocument();
    expect(screen.getByText("Actividad completada uno")).toBeInTheDocument();

    const pagination = screen.getByRole("navigation", { name: "Paginacion" });

    expect(within(pagination).getByRole("button", { name: "1" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(within(pagination).queryByRole("button", { name: "2" })).not.toBeInTheDocument();
  });

  it("should recover the initial agenda when the filters are cleared", async () => {
    const user = setupUser();

    renderLanding(buildCatalog());
    await screen.findByText("Actividad programada 1");

    await user.selectOptions(screen.getByRole("combobox", { name: "Periodo" }), "past");
    await screen.findByText("Actividad completada uno");

    await user.click(screen.getByRole("button", { name: "Limpiar filtros" }));

    expect(await screen.findByText("13 resultados")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "Actividades disponibles" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Actividad programada 1")).toBeInTheDocument();
    expect(screen.queryByText("Actividad completada uno")).not.toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Periodo" })).toHaveValue("available");
    expect(screen.getByRole("textbox", { name: "Buscar actividades" })).toHaveValue("");
  });

  it("should suggest changing the filters when there are no matches", async () => {
    const user = setupUser();

    renderLanding(buildCatalog());
    await screen.findByText("Actividad programada 1");

    await user.type(
      screen.getByRole("textbox", { name: "Buscar actividades" }),
      "sin coincidencias",
    );

    expect(await screen.findByText("No hay actividades con esos filtros")).toBeInTheDocument();
    expect(screen.getByText("0 resultados")).toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "Paginacion" })).not.toBeInTheDocument();
  });
});
