import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderWithProviders } from "@/test/render";

import { SelectionRequiredState } from "./SelectionRequiredState";

describe("SelectionRequiredState", () => {
  it("should explain that a working context is required", () => {
    renderWithProviders(
      <SelectionRequiredState message="Seleccione una opcion" title="Sin contexto" />,
    );

    expect(screen.getByText("Sin contexto")).toBeInTheDocument();
    expect(screen.getByText("Seleccione una opcion")).toBeInTheDocument();
  });
});
