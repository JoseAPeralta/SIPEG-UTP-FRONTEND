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

    for (const { label, path } of [
      { label: /aulas/i, path: "/admin/aulas" },
      { label: /programas/i, path: "/admin/programas" },
      { label: /unidades/i, path: "/admin/unidades" },
      { label: /carreras/i, path: "/admin/carreras" },
    ]) {
      expect(screen.getByRole("link", { name: label })).toHaveAttribute("href", path);
    }
  });

  it("should keep classrooms active while viewing a classroom detail", async () => {
    renderWithProviders(<AdminMenu />, { route: "/admin/aulas/aula-10" });

    expect(
      await screen.findByRole("link", { current: "page", name: /aulas/i }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("link", { current: "page", name: /panel/i })).not.toBeInTheDocument();
  });
});
