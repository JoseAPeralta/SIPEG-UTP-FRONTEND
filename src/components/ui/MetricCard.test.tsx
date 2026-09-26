import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderWithProviders } from "@/test/render";

import { MetricCard } from "./MetricCard";

describe("MetricCard", () => {
  it("should render the standard metric with label, value and detail", () => {
    renderWithProviders(
      <MetricCard
        appearance="standard"
        detail="Actividades visibles con el filtro actual"
        label="Actividades"
        tone="primary"
        value="32"
      />,
    );

    expect(screen.getByText("Actividades")).toBeInTheDocument();
    expect(screen.getByText("32")).toBeInTheDocument();
    expect(screen.getByText(/actividades visibles con el filtro actual/i)).toBeInTheDocument();
  });

  it("should render the operational metric", () => {
    renderWithProviders(
      <MetricCard
        appearance="operational"
        detail="Asistencias marcadas como presentes."
        label="Confirmados"
        value="128"
      />,
    );

    expect(screen.getByText("Confirmados")).toBeInTheDocument();
    expect(screen.getByText("128")).toBeInTheDocument();
    expect(screen.getByText(/asistencias marcadas como presentes/i)).toBeInTheDocument();
  });

  it("should render the summary metric with its value and label together", () => {
    renderWithProviders(
      <MetricCard
        appearance="summary"
        detail="Programas que agrupan la agenda institucional."
        label="programas"
        value="9"
      />,
    );

    expect(screen.getByText("9 programas")).toBeInTheDocument();
    expect(screen.getByText(/programas que agrupan la agenda institucional/i)).toBeInTheDocument();
  });
});
