import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import {
  createActivity,
  createClassroom,
  createEventProgram,
  createOrganizationalUnit,
} from "@/test/factories";
import { renderWithProviders } from "@/test/render";

import { ActivityCard } from "./ActivityCard";

const program = createEventProgram({ label: "Semana de innovacion" });
const unit = createOrganizationalUnit({ code: "FISC" });
const classroom = createClassroom({ name: "Auditorio Roberto Barraza" });

function renderCard(overrides: Partial<Parameters<typeof ActivityCard>[0]> = {}) {
  const onSelect = vi.fn();

  renderWithProviders(
    <ActivityCard
      activity={createActivity({
        speakers: [{ firstName: "Ana", id: "speaker-ana", lastName: "Perez" }],
      })}
      classroom={classroom}
      onSelect={onSelect}
      program={program}
      unit={unit}
      {...overrides}
    />,
  );

  return { onSelect };
}

describe("ActivityCard", () => {
  it("should show program, type, date and classroom", () => {
    renderCard();

    expect(screen.getByText("Semana de innovacion")).toBeInTheDocument();
    expect(screen.getByText("Charla")).toBeInTheDocument();
    expect(screen.queryByText("FISC")).not.toBeInTheDocument();
    expect(screen.getByText(/auditorio roberto barraza/i)).toBeInTheDocument();
    expect(screen.getByText(/ana perez/i)).toBeInTheDocument();
  });

  it("should show the unit name without the default program prefix", () => {
    renderCard({
      program: createEventProgram({
        isDefault: true,
        label: null,
        name: "Programa de Eventos - Facultad de Ingenieria Civil",
      }),
      unit: createOrganizationalUnit({ code: "FIC", name: "Facultad de Ingenieria Civil" }),
    });

    expect(screen.getByText("Facultad de Ingenieria Civil")).toBeInTheDocument();
    expect(screen.queryByText(/programa de eventos/i)).not.toBeInTheDocument();
  });

  it("should expand and collapse a long description", async () => {
    const user = userEvent.setup();
    const longDescription = "Detalle extenso ".repeat(20);

    renderCard({ activity: createActivity({ description: longDescription }) });

    const toggle = screen.getByRole("button", { name: /leer mas/i });

    await user.click(toggle);

    expect(screen.getByRole("button", { name: /leer menos/i })).toBeInTheDocument();
  });

  it("should report the selected activity", async () => {
    const user = userEvent.setup();
    const activity = createActivity({ id: "activity-9", name: "Actividad nueve" });
    const { onSelect } = renderCard({ activity });

    await user.click(screen.getByRole("button", { name: /usar actividad nueve en panel/i }));

    expect(onSelect).toHaveBeenCalledWith(activity);
  });

  it("should hide the selection action when no handler is provided", () => {
    renderCard({ onSelect: undefined });

    expect(screen.queryByRole("button", { name: /usar en panel/i })).not.toBeInTheDocument();
  });

  it("should mark the card as the active context", () => {
    renderCard({ isSelected: true });

    expect(
      screen.getByRole("button", { name: /usar actividad de prueba en panel/i }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText(/contexto activo/i)).toBeInTheDocument();
  });
});
