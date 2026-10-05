import { screen } from "@testing-library/react";
import { setupUser } from "@/test/user";
import { lazy, Suspense, type ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Route, Routes } from "react-router";

import { useSessionStore } from "@/store/session";
import { useUnitPreferenceStore } from "@/store/unitPreference";
import { useWorkingContextStore } from "@/store/workingContext";
import { createAuthenticatedUser, createAuthTokens } from "@/test/factories";
import { renderWithProviders } from "@/test/render";
import { stubDesktopViewport } from "@/test/viewport";

import { PersonalAreaLayout } from "./PersonalAreaLayout";

type SectionContent = () => ReactNode;

/** Stands in for a lazy route section that has not finished loading. */
const SuspendingSection = lazy(
  () =>
    new Promise<{ default: SectionContent }>(() => {
      // Never resolves: the section stays suspended for the whole assertion.
    }),
);

function renderLayout(route: string) {
  return renderWithProviders(
    <Routes>
      <Route element={<PersonalAreaLayout />}>
        <Route path="perfil/datos" element={<p>Contenido de datos</p>} />
        <Route path="perfil/seguridad" element={<p>Contenido de seguridad</p>} />
        <Route path="perfil/actividades" element={<p>Contenido de actividades</p>} />
        <Route path="perfil/certificados" element={<p>Contenido de certificados</p>} />
      </Route>
    </Routes>,
    { route },
  );
}

function areaHeading() {
  return screen.getByRole("heading", { level: 1, name: /area personal/i });
}

describe("PersonalAreaLayout", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    useSessionStore.getState().clearSession();
    useUnitPreferenceStore.getState().setSelectedUnitId("all");
    useWorkingContextStore.getState().clearWorkingContext();
    localStorage.clear();
    sessionStorage.clear();
  });

  it("presenta el encabezado del area y solo el contenido de la seccion activa", () => {
    stubDesktopViewport(true);
    renderLayout("/perfil/seguridad");

    expect(areaHeading()).toBeInTheDocument();
    expect(screen.getByText("Contenido de seguridad")).toBeInTheDocument();
    expect(screen.queryByText("Contenido de datos")).not.toBeInTheDocument();
  });

  it("deja la navegacion disponible aunque la seccion activa no cargue", () => {
    stubDesktopViewport(true);
    renderLayout("/perfil/actividades");

    expect(screen.getByRole("navigation", { name: /secciones del area personal/i })).toBeVisible();
    expect(screen.getByText("Contenido de actividades")).toBeInTheDocument();
  });

  it("navega a otra seccion y deja el foco en el encabezado del destino", async () => {
    const user = setupUser();
    stubDesktopViewport(true);
    renderLayout("/perfil/datos");

    await user.click(screen.getByRole("link", { name: "Mis actividades" }));

    expect(screen.getByText("Contenido de actividades")).toBeInTheDocument();
    expect(areaHeading()).toHaveFocus();
    expect(
      screen.getByRole("link", { current: "page", name: "Mis actividades" }),
    ).toBeInTheDocument();
  });

  it("enfoca el encabezado tambien al elegir la seccion que ya esta activa", async () => {
    const user = setupUser();
    stubDesktopViewport(true);
    renderLayout("/perfil/datos");

    await user.click(screen.getByRole("link", { name: "Datos de la cuenta" }));

    expect(areaHeading()).toHaveFocus();
  });

  it("cierra el desplegable y enfoca el encabezado al elegir una seccion en movil", async () => {
    const user = setupUser();
    stubDesktopViewport(false);
    renderLayout("/perfil/datos");

    expect(screen.queryByRole("link", { name: "Mis actividades" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /ver todas las secciones/i }));
    await user.click(screen.getByRole("link", { name: "Mis actividades" }));

    expect(screen.getByText("Contenido de actividades")).toBeInTheDocument();
    expect(areaHeading()).toHaveFocus();
    expect(screen.queryByRole("link", { name: "Datos de la cuenta" })).not.toBeInTheDocument();
  });

  it("devuelve el foco al boton al cerrar el desplegable con Escape", async () => {
    const user = setupUser();
    stubDesktopViewport(false);
    renderLayout("/perfil/datos");

    await user.click(screen.getByRole("button", { name: /ver todas las secciones/i }));
    await user.keyboard("{Escape}");

    expect(screen.getByRole("button", { name: /ver todas las secciones/i })).toHaveFocus();
    expect(screen.queryByRole("link", { name: "Mis actividades" })).not.toBeInTheDocument();
  });

  it("no mueve el foco cuando la seccion cambia por el historial del navegador", async () => {
    const user = setupUser();
    stubDesktopViewport(true);
    renderLayout("/perfil/datos");

    await user.click(screen.getByRole("link", { name: "Mis actividades" }));
    areaHeading().blur();

    expect(areaHeading()).not.toHaveFocus();
  });

  it("mantiene el desplegable abierto aunque la seccion destino siga cargando", async () => {
    const user = setupUser();
    stubDesktopViewport(false);

    renderWithProviders(
      <Routes>
        <Route element={<PersonalAreaLayout />}>
          <Route path="perfil/datos" element={<p>Contenido de datos</p>} />
          <Route
            path="perfil/actividades"
            element={
              <Suspense fallback={<p>Cargando seccion</p>}>
                <SuspendingSection />
              </Suspense>
            }
          />
        </Route>
      </Routes>,
      { route: "/perfil/datos" },
    );

    await user.click(screen.getByRole("button", { name: /ver todas las secciones/i }));
    await user.click(screen.getByRole("link", { name: "Mis actividades" }));

    expect(screen.getByText("Cargando seccion")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: /area personal/i })).toHaveFocus();

    await user.click(screen.getByRole("button", { name: /ver todas las secciones/i }));

    expect(screen.getByRole("link", { name: "Mis actividades" })).toBeInTheDocument();
    expect(
      screen.getByRole("link", { current: "page", name: "Mis actividades" }),
    ).toBeInTheDocument();
  });

  it("ofrece la misma navegacion a un administrador que a un usuario estandar", () => {
    stubDesktopViewport(true);
    useSessionStore.getState().setSession({
      currentUser: createAuthenticatedUser({ globalRole: "ADMIN" }),
      tokens: createAuthTokens(),
    });
    renderLayout("/perfil/certificados");

    expect(areaHeading()).toBeInTheDocument();
    expect(screen.getByRole("link", { current: "page", name: "Mis certificados" })).toBeVisible();
  });
});
