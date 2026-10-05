import { screen, within } from "@testing-library/react";
import { setupUser } from "@/test/user";
import { describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "@/test/render";

import { PersonalAreaNavigation, type PersonalAreaNavigationProps } from "./PersonalAreaNavigation";

type NavigationOptions = Partial<PersonalAreaNavigationProps> & { route?: string };

function renderNavigation({
  activeSectionId = "datos",
  isDesktop = true,
  route = "/perfil/datos",
  ...overrides
}: NavigationOptions = {}) {
  const props: PersonalAreaNavigationProps = {
    activeSectionId,
    isDesktop,
    onBeforeNavigate: vi.fn(),
    ...overrides,
  };

  renderWithProviders(<PersonalAreaNavigation {...props} />, { route });

  return props;
}

describe("PersonalAreaNavigation", () => {
  it("expone las cuatro secciones como enlaces de navegacion en escritorio", () => {
    renderNavigation();

    const navigation = screen.getByRole("navigation", { name: /secciones del area personal/i });
    const sections: [string, string][] = [
      ["Datos de la cuenta", "/perfil/datos"],
      ["Seguridad de la cuenta", "/perfil/seguridad"],
      ["Mis actividades", "/perfil/actividades"],
      ["Mis certificados", "/perfil/certificados"],
    ];

    for (const [label, path] of sections) {
      expect(within(navigation).getByRole("link", { name: label })).toHaveAttribute("href", path);
    }
  });

  it("marca con aria-current la seccion que corresponde a la ruta", () => {
    renderNavigation({ activeSectionId: "certificados", route: "/perfil/certificados" });

    expect(screen.getByRole("link", { current: "page", name: "Mis certificados" })).toHaveAttribute(
      "href",
      "/perfil/certificados",
    );
    expect(screen.getAllByRole("link", { current: "page" })).toHaveLength(1);
  });

  it("no ofrece boton de despliegue en escritorio", () => {
    renderNavigation({ isDesktop: true });

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("mantiene el nombre de la seccion actual visible y oculta los enlaces en movil", () => {
    renderNavigation({
      activeSectionId: "actividades",
      isDesktop: false,
      route: "/perfil/actividades",
    });

    const toggle = screen.getByRole("button", { name: /ver todas las secciones/i });

    expect(within(toggle.parentElement!).getByText("Mis actividades")).toBeVisible();
    expect(screen.queryByRole("link", { name: "Mis actividades" })).not.toBeInTheDocument();
    expect(toggle).toHaveAttribute("aria-expanded", "false");

    const controlledId = toggle.getAttribute("aria-controls");
    const navigation = controlledId ? document.getElementById(controlledId) : null;

    expect(controlledId).toBe("personal-area-sections");
    expect(navigation).not.toBeNull();
    expect(navigation).toHaveAttribute("aria-label", "Secciones del area personal");
  });

  it("lista los cuatro enlaces en el orden del submenu al desplegar", async () => {
    const user = setupUser();
    renderNavigation({ isDesktop: false });

    await user.click(screen.getByRole("button", { name: /ver todas las secciones/i }));

    expect(screen.getByRole("button", { name: /ocultar secciones/i })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    expect(screen.getAllByRole("link").map((link) => link.textContent)).toEqual([
      "Datos de la cuenta",
      "Seguridad de la cuenta",
      "Mis actividades",
      "Mis certificados",
    ]);
  });

  it("avisa al layout antes de navegar a otra seccion", async () => {
    const user = setupUser();
    const props = renderNavigation({ isDesktop: false });

    await user.click(screen.getByRole("button", { name: /ver todas las secciones/i }));
    await user.click(screen.getByRole("link", { name: "Mis certificados" }));

    expect(props.onBeforeNavigate).toHaveBeenCalledWith("/perfil/certificados");
  });

  it("cierra el desplegable al elegir una seccion", async () => {
    const user = setupUser();
    renderNavigation({ isDesktop: false, route: "/perfil/datos" });

    await user.click(screen.getByRole("button", { name: /ver todas las secciones/i }));
    await user.click(screen.getByRole("link", { name: "Mis actividades" }));

    expect(screen.queryByRole("link", { name: "Mis actividades" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /ver todas las secciones/i })).toBeVisible();
  });

  it("devuelve el foco al boton y cierra el desplegable con Escape", async () => {
    const user = setupUser();
    renderNavigation({ isDesktop: false });

    const toggle = screen.getByRole("button", { name: /ver todas las secciones/i });

    await user.click(toggle);
    await user.keyboard("{Escape}");

    expect(toggle).toHaveFocus();
    expect(screen.queryByRole("link", { name: "Mis actividades" })).not.toBeInTheDocument();
  });
});
