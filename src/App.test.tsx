import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import { App } from "@/App";
import { useSessionStore } from "@/store/session";
import { useUnitPreferenceStore } from "@/store/unitPreference";
import { useWorkingContextStore } from "@/store/workingContext";
import { createUser } from "@/test/factories";
import { renderWithProviders } from "@/test/render";

const demoUser = createUser({ globalRole: "ADMIN" });

describe("App", () => {
  beforeEach(() => {
    useSessionStore.getState().logout();
    useUnitPreferenceStore.getState().setSelectedUnitId("all");
    useWorkingContextStore.getState().clearWorkingContext();
    localStorage.clear();
  });

  it("should render the public landing page on the index route", async () => {
    renderWithProviders(<App />);

    expect(
      await screen.findByRole(
        "heading",
        { level: 1, name: /descubre actividades academicas/i },
        { timeout: 5000 },
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: /navegacion principal/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^sipeg$/i })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: /iniciar sesion/i })).toHaveAttribute("href", "/login");
    expect(
      screen.queryByRole("link", { name: /panel de administracion/i }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("contentinfo")).toHaveTextContent(/sipeg/i);
  });

  it("should redirect protected admin routes to login when there is no session", async () => {
    renderWithProviders(<App />, { route: "/admin" });

    expect(
      await screen.findByRole("heading", { level: 1, name: /iniciar sesion en sipeg/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /iniciar sesion/i })).toHaveAttribute("href", "/login");
  });

  it("should render the administration menu when a session exists", async () => {
    useSessionStore.getState().login(demoUser);

    renderWithProviders(<App />, { route: "/admin" });

    expect(
      await screen.findByRole(
        "heading",
        { level: 1, name: /panel operativo sipeg/i },
        { timeout: 5000 },
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /panel de administracion/i })).toHaveAttribute(
      "href",
      "/admin",
    );
    expect(screen.getByRole("navigation", { name: /navegacion del panel/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /eventos/i })).toHaveAttribute(
      "href",
      "/admin/eventos",
    );
    expect(screen.getByRole("link", { name: /asistencia/i })).toHaveAttribute(
      "href",
      "/admin/asistencia",
    );
    expect(screen.getByRole("link", { name: /certificados/i })).toHaveAttribute(
      "href",
      "/admin/certificados",
    );
    expect(screen.getByRole("link", { name: /reportes/i })).toHaveAttribute(
      "href",
      "/admin/reportes",
    );
    expect(screen.getByRole("combobox", { name: /contexto de trabajo/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /cerrar sesion/i })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /iniciar sesion/i })).not.toBeInTheDocument();
  });

  it("should redirect legacy administration routes to the admin layout", async () => {
    useSessionStore.getState().login(demoUser);

    renderWithProviders(<App />, { route: "/asistencia" });

    expect(
      await screen.findByRole("heading", { level: 1, name: /asistencia/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: /contexto de trabajo/i })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: /navegacion del panel/i })).toBeInTheDocument();
  });

  it("should keep admin modules scoped to the selected event program", async () => {
    const user = userEvent.setup();
    useSessionStore.getState().login(demoUser);

    renderWithProviders(<App />, { route: "/admin/asistencia" });

    expect(
      await screen.findByRole("heading", { level: 1, name: /asistencia/i }),
    ).toBeInTheDocument();
    expect(
      await within(screen.getByRole("main")).findByText(/^selecciona un contexto de trabajo$/i),
    ).toBeInTheDocument();

    await user.selectOptions(
      await screen.findByRole("combobox", { name: /contexto de trabajo/i }),
      "eventProgram:program-innovation-week",
    );

    const adminContent = within(screen.getByRole("main"));

    expect(
      await adminContent.findByText(/gobernanza de datos abiertos universitarios/i),
    ).toBeInTheDocument();
    expect(adminContent.getByText(/128 inscritos/i)).toBeInTheDocument();
    expect(adminContent.queryByText(/puentes resilientes/i)).not.toBeInTheDocument();
  });

  it("should start and close the demo session from the navigation flow", async () => {
    const user = userEvent.setup();

    renderWithProviders(<App />, { route: "/login" });

    await user.click(
      await screen.findByRole("button", {
        name: /iniciar sesion/i,
      }),
    );

    expect(
      await screen.findByRole("heading", { level: 1, name: /panel operativo sipeg/i }),
    ).toBeInTheDocument();
    expect(useSessionStore.getState().currentUser?.id).toBe(demoUser.id);

    await user.click(screen.getByRole("button", { name: /cerrar sesion/i }));

    expect(
      await screen.findByRole("heading", { level: 1, name: /descubre actividades academicas/i }),
    ).toBeInTheDocument();
    expect(useSessionStore.getState().currentUser).toBeNull();
    expect(screen.getByRole("link", { name: /iniciar sesion/i })).toHaveAttribute("href", "/login");
  });

  it("should clear the working context when the session closes", async () => {
    const user = userEvent.setup();
    useSessionStore.getState().login(demoUser);
    useWorkingContextStore
      .getState()
      .setWorkingContext({ id: "program-innovation-week", kind: "eventProgram" });
    useUnitPreferenceStore.getState().setSelectedUnitId("fisc");

    renderWithProviders(<App />, { route: "/admin" });

    await user.click(await screen.findByRole("button", { name: /cerrar sesion/i }));

    expect(
      await screen.findByRole("heading", { level: 1, name: /descubre actividades academicas/i }),
    ).toBeInTheDocument();
    expect(useWorkingContextStore.getState().workingContext).toBeNull();
    expect(useUnitPreferenceStore.getState().selectedUnitId).toBe("all");
  });
});
