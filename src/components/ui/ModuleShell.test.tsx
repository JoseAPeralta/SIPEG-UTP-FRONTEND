import { screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it } from "vitest";

import { renderWithProviders } from "@/test/render";

import { ModuleShell } from "./ModuleShell";

describe("ModuleShell", () => {
  it("expone el encabezado de ruta como objetivo de foco programatico", () => {
    const headingRef = createRef<HTMLHeadingElement>();

    renderWithProviders(
      <ModuleShell
        description="Consulte los datos de su cuenta."
        headingLabel="Mi perfil"
        headingRef={headingRef}
        title="Area personal"
      >
        <p>Contenido</p>
      </ModuleShell>,
    );

    const heading = screen.getByRole("heading", { level: 1, name: "Area personal" });

    expect(headingRef.current).toBe(heading);
    expect(heading).toHaveAttribute("tabindex", "-1");
  });

  it("mantiene el encabezado enfocable aunque la vista no pase un ref", () => {
    renderWithProviders(
      <ModuleShell
        description="Consulte los indicadores."
        headingLabel="Gestion academica"
        title="Resumen operativo"
      >
        <p>Contenido</p>
      </ModuleShell>,
    );

    expect(screen.getByRole("heading", { level: 1, name: "Resumen operativo" })).toHaveAttribute(
      "tabindex",
      "-1",
    );
  });
});
