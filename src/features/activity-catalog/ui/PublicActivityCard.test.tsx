import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { createPublicActivity } from "@/test/factories";
import { renderWithProviders } from "@/test/render";
import type { PublicActivity, PublicActivityStatus } from "@/types/domain";

import { buildPublicActivityRows } from "../model/publicCatalogSelectors";

import { PublicActivityCard } from "./PublicActivityCard";

const LONG_DESCRIPTION =
  "Taller practico de levantamiento topografico con drones, abierto a estudiantes de Ingenieria Civil y de ingenieria de Sistemas Computacionales, con equipos del laboratorio de geodesia y apoyo del semillero de inspeccion.";

function renderCard(overrides: Partial<PublicActivity> = {}) {
  const [row] = buildPublicActivityRows({
    activities: [createPublicActivity({ id: "card-1", ...overrides })],
  });

  if (!row) {
    throw new Error("La fila de la tarjeta no pudo construirse.");
  }

  renderWithProviders(<PublicActivityCard row={row} />);

  return row;
}

describe("PublicActivityCard", () => {
  it.each([
    { label: "Programada", status: "SCHEDULED" },
    { label: "En curso", status: "ONGOING" },
    { label: "Completada", status: "COMPLETED" },
  ] satisfies { label: string; status: PublicActivityStatus }[])(
    "should show the $status status as $label",
    ({ label, status }) => {
      renderCard({ status });

      expect(screen.getByText(label)).toBeInTheDocument();
      expect(screen.queryByText(status)).not.toBeInTheDocument();
    },
  );

  it("should keep the long description toggle", () => {
    renderCard({ description: LONG_DESCRIPTION });

    expect(screen.getByRole("button", { name: /leer mas/i })).toBeInTheDocument();
  });

  it("should keep the program and activity type badges next to the status", () => {
    renderCard();

    expect(screen.getByText("Semana de innovacion")).toBeInTheDocument();
    expect(screen.getByText("Charla")).toBeInTheDocument();
    expect(screen.getByText("Programada")).toBeInTheDocument();
  });

  it("should link the activity name to its public detail", () => {
    const row = renderCard({ name: "Taller de topografia con drones" });

    expect(screen.getByRole("link", { name: "Taller de topografia con drones" })).toHaveAttribute(
      "href",
      `/actividades/${row.activity.id}`,
    );
  });
});
