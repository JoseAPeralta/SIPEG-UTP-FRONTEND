import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderWithProviders } from "@/test/render";

import { AdminMenu } from "./AdminMenu";

describe("AdminMenu", () => {
  it("should link every implemented administrative module", async () => {
    renderWithProviders(<AdminMenu />, { route: "/admin" });

    expect(
      await screen.findByRole("combobox", { name: /contexto de trabajo/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /aulas/i })).toHaveAttribute("href", "/admin/aulas");
    expect(screen.getByRole("link", { name: /ponentes/i })).toHaveAttribute(
      "href",
      "/admin/ponentes",
    );
    expect(screen.getByRole("link", { name: /usuarios/i })).toHaveAttribute(
      "href",
      "/admin/usuarios",
    );
  });
});
