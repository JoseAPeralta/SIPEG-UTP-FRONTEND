import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderWithProviders } from "@/test/render";

import { SectionHeader } from "./SectionHeader";

describe("SectionHeader", () => {
  it("should render a level two heading with heading label and description", () => {
    renderWithProviders(
      <SectionHeader
        description="Programas que agrupan la agenda."
        headingLabel="Agenda institucional"
        id="programs-title"
        title="Programas de eventos"
      />,
    );

    expect(
      screen.getByRole("heading", { level: 2, name: /programas de eventos/i }),
    ).toHaveAttribute("id", "programs-title");
    expect(screen.getByText(/agenda institucional/i)).toBeInTheDocument();
    expect(screen.getByText(/programas que agrupan la agenda/i)).toBeInTheDocument();
  });

  it("should announce the status when provided", () => {
    renderWithProviders(
      <SectionHeader status="Contexto activo: Semana de innovacion" title="Catalogo" />,
    );

    expect(screen.getByRole("status")).toHaveTextContent(/contexto activo: semana de innovacion/i);
  });
});
