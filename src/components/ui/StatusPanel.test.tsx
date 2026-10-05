import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderWithProviders } from "@/test/render";

import { StatusPanel } from "./StatusPanel";

describe("StatusPanel", () => {
  it("should announce progress by default", () => {
    renderWithProviders(<StatusPanel>Cargando informacion...</StatusPanel>);

    expect(screen.getByRole("status")).toHaveTextContent(/cargando informacion/i);
  });

  it("should use the requested alert role", () => {
    renderWithProviders(<StatusPanel role="alert">Sin conexion</StatusPanel>);

    expect(screen.getByRole("alert")).toHaveTextContent(/sin conexion/i);
  });
});
