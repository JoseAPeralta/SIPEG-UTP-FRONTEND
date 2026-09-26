import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { App } from "@/App";
import { createAppAdapters, type AuthAdapter } from "@/app/adapters";
import { useSessionStore } from "@/store/session";
import { useUnitPreferenceStore } from "@/store/unitPreference";
import { useWorkingContextStore } from "@/store/workingContext";
import { createAuthenticatedUser, createAuthTokens } from "@/test/factories";
import { renderWithProviders } from "@/test/render";

const demoUser = createAuthenticatedUser({ globalRole: "ADMIN" });
const demoTokens = createAuthTokens();

describe("App", () => {
  beforeEach(() => {
    useSessionStore.getState().clearSession();
    useUnitPreferenceStore.getState().setSelectedUnitId("all");
    useWorkingContextStore.getState().clearWorkingContext();
    localStorage.clear();
    sessionStorage.clear();
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
    expect(screen.getByRole("link", { name: /iniciar sesi[oó]n/i })).toHaveAttribute(
      "href",
      "/login",
    );
    expect(
      screen.queryByRole("link", { name: /panel de administracion/i }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("contentinfo")).toHaveTextContent(/sipeg/i);
  });

  it("should redirect protected admin routes to login when there is no session", async () => {
    renderWithProviders(<App />, { route: "/admin" });

    expect(
      await screen.findByRole("heading", { level: 1, name: /iniciar sesi[oó]n en sipeg/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /iniciar sesi[oó]n/i })).toHaveAttribute(
      "href",
      "/login",
    );
  });

  it("should render the administration menu when a session exists", async () => {
    useSessionStore.getState().setSession({ currentUser: demoUser, tokens: demoTokens });

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
    expect(screen.getByRole("button", { name: /cerrar sesi[oó]n/i })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /iniciar sesi[oó]n/i })).not.toBeInTheDocument();
  });

  it("should redirect legacy administration routes to the admin layout", async () => {
    useSessionStore.getState().setSession({ currentUser: demoUser, tokens: demoTokens });

    renderWithProviders(<App />, { route: "/asistencia" });

    expect(
      await screen.findByRole("heading", { level: 1, name: /asistencia/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: /contexto de trabajo/i })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: /navegacion del panel/i })).toBeInTheDocument();
  });

  it("should keep admin modules scoped to the selected event program", async () => {
    const user = userEvent.setup();
    useSessionStore.getState().setSession({ currentUser: demoUser, tokens: demoTokens });

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

  it("should start and close a real adapter session from the navigation flow", async () => {
    const user = userEvent.setup();

    renderWithProviders(<App />, { route: "/login" });

    await user.type(
      screen.getByRole("textbox", { name: /correo electronico/i }),
      "mariana.rodriguez@example.edu",
    );
    await user.type(screen.getByLabelText(/contrasena/i), "sipeg-demo");
    await user.click(
      await screen.findByRole("button", {
        name: /iniciar sesi[oó]n/i,
      }),
    );

    expect(
      await screen.findByRole("heading", { level: 1, name: /panel operativo sipeg/i }),
    ).toBeInTheDocument();
    expect(useSessionStore.getState().currentUser?.id).toBe(demoUser.id);

    await user.click(screen.getByRole("button", { name: /cerrar sesi[oó]n/i }));

    expect(
      await screen.findByRole("heading", { level: 1, name: /descubre actividades academicas/i }),
    ).toBeInTheDocument();
    expect(useSessionStore.getState().currentUser).toBeNull();
    expect(screen.getByRole("link", { name: /iniciar sesi[oó]n/i })).toHaveAttribute(
      "href",
      "/login",
    );
  });

  it("should send standard users to the public landing after login", async () => {
    const user = userEvent.setup();
    const adapters = createAppAdapters({ source: "mock" });
    const standardUserAuth: AuthAdapter = {
      ...adapters.auth,
      loadCurrentUser: vi.fn().mockResolvedValue(createAuthenticatedUser({ globalRole: "USER" })),
      login: vi.fn().mockResolvedValue(demoTokens),
    };

    renderWithProviders(<App />, {
      adapters: { ...adapters, auth: standardUserAuth },
      route: "/login",
    });

    await user.type(
      await screen.findByRole("textbox", { name: /correo electronico/i }),
      "usuario@example.edu",
    );
    await user.type(screen.getByLabelText(/contrasena/i), "sipeg-demo");
    await user.click(await screen.findByRole("button", { name: /iniciar sesi[oó]n/i }));

    expect(
      await screen.findByRole("heading", { level: 1, name: /descubre actividades academicas/i }),
    ).toBeInTheDocument();
    expect(useSessionStore.getState().currentUser?.globalRole).toBe("USER");
    expect(
      screen.queryByRole("link", { name: /panel de administracion/i }),
    ).not.toBeInTheDocument();
  });

  it("should clear the working context when the session closes", async () => {
    const user = userEvent.setup();
    useSessionStore.getState().setSession({ currentUser: demoUser, tokens: demoTokens });
    useWorkingContextStore
      .getState()
      .setWorkingContext({ id: "program-innovation-week", kind: "eventProgram" });
    useUnitPreferenceStore.getState().setSelectedUnitId("fisc");

    renderWithProviders(<App />, { route: "/admin" });

    await user.click(await screen.findByRole("button", { name: /cerrar sesi[oó]n/i }));

    expect(
      await screen.findByRole("heading", { level: 1, name: /descubre actividades academicas/i }),
    ).toBeInTheDocument();
    expect(useWorkingContextStore.getState().workingContext).toBeNull();
    expect(useUnitPreferenceStore.getState().selectedUnitId).toBe("all");
  });

  it("should keep non-admin users outside administrative routes", async () => {
    useSessionStore.getState().setSession({
      currentUser: createAuthenticatedUser({ globalRole: "USER" }),
      tokens: demoTokens,
    });

    renderWithProviders(<App />, { route: "/admin" });

    expect(
      await screen.findByRole("heading", { level: 1, name: /descubre actividades academicas/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /panel de administracion/i }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /cerrar sesi[oó]n/i })).toBeInTheDocument();
  });
});
