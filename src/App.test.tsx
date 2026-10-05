import { Box, Button, Text } from "@chakra-ui/react";
import { screen, within } from "@testing-library/react";
import { setupUser } from "@/test/user";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useLocation, useNavigate } from "react-router";

import { App } from "@/App";
import { createAppAdapters, type AuthAdapter } from "@/app/adapters";
import { useSessionStore } from "@/store/session";
import { useUnitPreferenceStore } from "@/store/unitPreference";
import { useWorkingContextStore } from "@/store/workingContext";
import { createAuthenticatedUser, createAuthTokens, createUserScope } from "@/test/factories";
import { renderWithProviders } from "@/test/render";
import { stubDesktopViewport } from "@/test/viewport";
import type { AuthTokens, GlobalRole } from "@/types/domain";

const demoUser = createAuthenticatedUser({ globalRole: "ADMIN" });
const demoTokens = createAuthTokens();

const personalAreaSections = [
  { content: /mantenga sus datos al d[ií]a/i, label: "Datos de la cuenta", path: "datos" },
  { content: /cambie su contrase[nñ]a/i, label: "Seguridad de la cuenta", path: "seguridad" },
  { content: /inscripciones/i, label: "Mis actividades", path: "actividades" },
  { content: /descargar los certificados/i, label: "Mis certificados", path: "certificados" },
  { content: /revise las novedades/i, label: "Mis alertas", path: "alertas" },
] as const satisfies readonly { content: RegExp; label: string; path: string }[];

const institutionalAdminRoutes = [
  { heading: /^Aulas$/, path: "aulas" },
  { heading: "Unidades organizativas", path: "unidades" },
  { heading: "Carreras", path: "carreras" },
] as const;

/**
 * Drives the real router history so the assertion observes the back and forward entries instead of
 * reimplementing their semantics. It renders two controls that no product screen exposes, and it lives
 * only in this test.
 */
function HistoryProbe() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <Box data-testid="history-probe">
      <Text data-testid="history-path">{location.pathname}</Text>
      <Button onClick={() => navigate(-1)} type="button">
        Retroceder historial
      </Button>
      <Button onClick={() => navigate(1)} type="button">
        Avanzar historial
      </Button>
    </Box>
  );
}

/**
 * Reads the marked section straight from the submenu DOM. The submenu is `display: none` while the
 * mobile disclosure is closed, so it is not reachable through a role query in that state.
 */
function currentPersonalAreaSection() {
  return document.getElementById("personal-area-sections")?.querySelector('[aria-current="page"]')
    ?.textContent;
}

describe("App", () => {
  it.each([
    { label: "Visualizador", grants: ["activity:read"], delegates: false },
    { label: "Editor", grants: ["activity:read", "activity:update"], delegates: false },
    { label: "Organizador", grants: ["activity:read", "permission:grant"], delegates: true },
  ])("opens scoped operations for $label using effective grants", async ({ grants, delegates }) => {
    useSessionStore.getState().setSession({
      currentUser: createAuthenticatedUser({ globalRole: "USER" }),
      tokens: demoTokens,
    });
    const permissions = grants.map((name) => ({
      name,
      origin: "LOCAL" as const,
      validFrom: null,
      validUntil: null,
    }));
    const scope = createUserScope({
      type: "activity",
      id: "private-activity",
      name: "Actividad privada",
      permissions,
    });
    const adapters = createAppAdapters({ source: "mock" });
    adapters.userScopes.loadUserScopes = vi.fn().mockResolvedValue([scope]);
    adapters.ownPermissions.loadOwnPermissions = vi
      .fn()
      .mockResolvedValue({ scope: { type: "activity", id: scope.id }, permissions });
    adapters.collaborators.loadCollaborators = vi.fn().mockResolvedValue([]);
    renderWithProviders(<App />, { adapters, route: "/operaciones/actividades/private-activity" });
    expect(
      await screen.findByRole("heading", { level: 1, name: "Actividad privada" }),
    ).toBeInTheDocument();
    expect(await screen.findByText("Ver actividades")).toBeInTheDocument();
    if (delegates)
      expect(
        await screen.findByRole("button", { name: "Agregar colaborador" }),
      ).toBeInTheDocument();
    else
      expect(screen.queryByRole("button", { name: "Agregar colaborador" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Usuarios" })).not.toBeInTheDocument();
    expect(await screen.findByRole("link", { name: "Mis operaciones" })).toBeInTheDocument();
  });

  it("denies a direct URL outside the discovered scopes", async () => {
    useSessionStore.getState().setSession({
      currentUser: createAuthenticatedUser({ globalRole: "USER" }),
      tokens: demoTokens,
    });
    const adapters = createAppAdapters({ source: "mock" });
    adapters.userScopes.loadUserScopes = vi.fn().mockResolvedValue([]);
    adapters.ownPermissions.loadOwnPermissions = vi.fn();
    renderWithProviders(<App />, { adapters, route: "/operaciones/programas/foreign" });
    expect(await screen.findByText("Contexto no autorizado")).toBeInTheDocument();
    expect(adapters.ownPermissions.loadOwnPermissions).not.toHaveBeenCalled();
  });
  beforeEach(() => {
    stubDesktopViewport(true);
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
        { level: 1, name: /descubra actividades academicas/i },
        { timeout: 5000 },
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: /navegacion principal/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^sipeg$/i })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: /iniciar sesi[oó]n/i })).toHaveAttribute(
      "href",
      "/login",
    );
    expect(screen.getByRole("link", { name: /registrarse/i })).toHaveAttribute("href", "/registro");
    expect(
      screen.queryByRole("link", { name: /panel de administracion/i }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("contentinfo")).toHaveTextContent(/sipeg/i);
  });

  it("should keep the landing visible while the session is still being restored", async () => {
    // El refresh nunca resuelve: reproduce la pestana lenta o sin red.
    const auth: AuthAdapter = {
      ...createAppAdapters({ source: "mock" }).auth,
      refresh: vi.fn<AuthAdapter["refresh"]>(() => new Promise<AuthTokens>(() => undefined)),
    };

    useSessionStore.setState({ status: "restoring" });
    renderWithProviders(<App />, {
      adapters: { ...createAppAdapters({ source: "mock" }), auth },
    });

    expect(
      await screen.findByRole(
        "heading",
        { level: 1, name: /descubra actividades academicas/i },
        { timeout: 5000 },
      ),
    ).toBeInTheDocument();
  });

  it("should not offer the session links before knowing whether a session exists", async () => {
    const auth: AuthAdapter = {
      ...createAppAdapters({ source: "mock" }).auth,
      refresh: vi.fn<AuthAdapter["refresh"]>(() => new Promise<AuthTokens>(() => undefined)),
    };

    useSessionStore.setState({ status: "restoring" });
    renderWithProviders(<App />, {
      adapters: { ...createAppAdapters({ source: "mock" }), auth },
    });

    const navigation = await screen.findByRole("navigation", { name: /navegacion principal/i });

    expect(within(navigation).queryByRole("link", { name: /iniciar sesi[oó]n/i })).toBeNull();
    expect(within(navigation).queryByRole("link", { name: /registrarse/i })).toBeNull();
  });

  it("should wait for the session before redirecting a protected route", async () => {
    let resolveRefresh: ((tokens: ReturnType<typeof createAuthTokens>) => void) | undefined;
    const auth: AuthAdapter = {
      ...createAppAdapters({ source: "mock" }).auth,
      loadCurrentUser: vi.fn(() => Promise.resolve(demoUser)),
      refresh: vi.fn(
        () =>
          new Promise<ReturnType<typeof createAuthTokens>>((resolve) => {
            resolveRefresh = resolve;
          }),
      ),
    };

    useSessionStore.setState({ status: "restoring" });
    renderWithProviders(<App />, {
      adapters: { ...createAppAdapters({ source: "mock" }), auth },
      route: "/perfil/datos",
    });

    // Mientras no se restaura, no se redirige: una sesion valida seria expulsada.
    expect(
      screen.queryByRole("heading", { level: 1, name: /cree su cuenta en sipeg/i }),
    ).not.toBeInTheDocument();

    resolveRefresh?.(demoTokens);

    expect(
      await screen.findByRole("heading", { level: 1, name: /area personal/i }, { timeout: 5000 }),
    ).toBeInTheDocument();
    expect(await screen.findByText(/mantenga sus datos al d[ií]a/i)).toBeInTheDocument();
  });

  it("should render public registration without an active session", async () => {
    renderWithProviders(<App />, { route: "/registro" });

    expect(
      await screen.findByRole("heading", { level: 1, name: /cree su cuenta en sipeg/i }),
    ).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: /crear cuenta/i })).toBeEnabled();
    expect(screen.getByRole("combobox", { name: /unidad \/ facultad/i })).toBeEnabled();
    expect(screen.getByRole("combobox", { name: /carrera/i })).toBeInTheDocument();
  });

  it("should render the password recovery request without an active session", async () => {
    renderWithProviders(<App />, { route: "/forgot-password" });

    expect(
      await screen.findByRole("heading", { level: 1, name: /recuperar contrase[nñ]a/i }),
    ).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: /enviar enlace/i })).toBeEnabled();
  });

  it("should render the password reset form from a direct link", async () => {
    renderWithProviders(<App />, { route: "/reset-password?token=reset-token" });

    expect(
      await screen.findByRole("heading", { level: 1, name: /restablecer contrase[nñ]a/i }),
    ).toBeInTheDocument();
    expect(await screen.findByLabelText(/nueva contrase[nñ]a/i)).toBeInTheDocument();
  });

  it("should confirm a completed password reset on the login destination", async () => {
    renderWithProviders(<App />, { route: "/login?reset=1" });

    expect(
      await screen.findByText(/su contrase[nñ]a ha sido restablecida.*inicie sesi[oó]n/i),
    ).toBeInTheDocument();
  });

  it("should complete the recovery journey from the login form to a new password", async () => {
    const user = setupUser();
    const adapters = createAppAdapters({ source: "mock" });
    const auth: AuthAdapter = {
      ...adapters.auth,
      requestPasswordReset: vi.fn().mockResolvedValue(undefined),
      resetPassword: vi.fn().mockResolvedValue(undefined),
    };

    renderWithProviders(<App />, {
      adapters: { ...adapters, auth },
      route: "/login",
    });

    await user.click(await screen.findByRole("link", { name: /olvid[oó] su contrase[nñ]a/i }));

    expect(
      await screen.findByRole("heading", { level: 1, name: /recuperar contrase[nñ]a/i }),
    ).toBeInTheDocument();

    await user.type(
      screen.getByRole("textbox", { name: /correo electr[oó]nico/i }),
      "persona@example.edu",
    );
    await user.click(screen.getByRole("button", { name: /enviar enlace/i }));

    expect(auth.requestPasswordReset).toHaveBeenCalledWith({ email: "persona@example.edu" });
    expect(await screen.findByText(/si existe una cuenta asociada al correo/i)).toBeInTheDocument();
  });

  it("should redirect protected admin routes to login when there is no session", async () => {
    renderWithProviders(<App />, { route: "/admin" });

    expect(
      await screen.findByRole("heading", { level: 1, name: /^iniciar sesi[oó]n$/i }),
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
    expect(screen.queryByRole("link", { name: /registrarse/i })).not.toBeInTheDocument();
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

  it.each([
    ...institutionalAdminRoutes,
    { heading: /registro de ponentes/i, path: "ponentes" },
    { heading: /^Usuarios$/, path: "usuarios" },
  ])("should render /admin/$path inside the admin layout", async ({ path, heading }) => {
    useSessionStore.getState().setSession({ currentUser: demoUser, tokens: demoTokens });

    renderWithProviders(<App />, { route: `/admin/${path}` });

    expect(await screen.findByRole("heading", { level: 1, name: heading })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: /navegacion del panel/i })).toBeInTheDocument();
  });

  it.each([
    ...institutionalAdminRoutes,
    { heading: /registro de ponentes/i, path: "ponentes" },
    { heading: /^Usuarios$/, path: "usuarios" },
  ])("should redirect the legacy /$path route to the admin layout", async ({ path, heading }) => {
    useSessionStore.getState().setSession({ currentUser: demoUser, tokens: demoTokens });

    renderWithProviders(
      <>
        <App />
        <HistoryProbe />
      </>,
      { route: `/${path}` },
    );

    expect(await screen.findByRole("heading", { level: 1, name: heading })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: /navegacion del panel/i })).toBeInTheDocument();
    expect(screen.getByTestId("history-path")).toHaveTextContent(`/admin/${path}`);
  });

  it.each(institutionalAdminRoutes)(
    "should keep /admin/$path closed to a standard user",
    async ({ heading, path }) => {
      useSessionStore.getState().setSession({
        currentUser: createAuthenticatedUser({ globalRole: "USER" }),
        tokens: demoTokens,
      });

      renderWithProviders(<App />, { route: `/admin/${path}` });

      expect(
        await screen.findByRole("heading", { level: 1, name: /[aá]rea personal/i }),
      ).toBeInTheDocument();
      expect(screen.queryByRole("heading", { level: 1, name: heading })).not.toBeInTheDocument();
      expect(
        screen.queryByRole("navigation", { name: /navegacion del panel/i }),
      ).not.toBeInTheDocument();
    },
  );

  it.each(institutionalAdminRoutes)(
    "should redirect anonymous visitors away from /admin/$path",
    async ({ heading, path }) => {
      renderWithProviders(<App />, { route: `/admin/${path}` });

      expect(
        await screen.findByRole("heading", { level: 1, name: /^iniciar sesi[oó]n$/i }),
      ).toBeInTheDocument();
      expect(screen.queryByRole("heading", { level: 1, name: heading })).not.toBeInTheDocument();
    },
  );

  it("should render the unit detail inside the admin layout", async () => {
    useSessionStore.getState().setSession({ currentUser: demoUser, tokens: demoTokens });

    renderWithProviders(<App />, { route: "/admin/unidades/fisc" });

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: /facultad de ingenier[ií]a de sistemas/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: /navegacion del panel/i })).toBeInTheDocument();
  });

  it("should keep the unit detail closed to a standard user", async () => {
    useSessionStore.getState().setSession({
      currentUser: createAuthenticatedUser({ globalRole: "USER" }),
      tokens: demoTokens,
    });

    renderWithProviders(<App />, { route: "/admin/unidades/fisc" });

    expect(
      await screen.findByRole("heading", { level: 1, name: /[aá]rea personal/i }),
    ).toBeInTheDocument();
  });

  it("should render the user detail inside the admin layout", async () => {
    useSessionStore.getState().setSession({ currentUser: demoUser, tokens: demoTokens });

    renderWithProviders(<App />, { route: "/admin/usuarios/user-2" });

    expect(
      await screen.findByRole("heading", { level: 1, name: /carlos m[eé]ndez/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: /navegacion del panel/i })).toBeInTheDocument();
  });

  it("should keep the user detail closed to a standard user", async () => {
    useSessionStore.getState().setSession({
      currentUser: createAuthenticatedUser({ globalRole: "USER" }),
      tokens: demoTokens,
    });

    renderWithProviders(<App />, { route: "/admin/usuarios/user-2" });

    expect(
      await screen.findByRole("heading", { level: 1, name: /[aá]rea personal/i }),
    ).toBeInTheDocument();
  });

  it("should keep admin modules scoped to the selected event program", async () => {
    const user = setupUser();
    useSessionStore.getState().setSession({ currentUser: demoUser, tokens: demoTokens });

    renderWithProviders(<App />, { route: "/admin/asistencia" });

    expect(
      await screen.findByRole("heading", { level: 1, name: /asistencia/i }),
    ).toBeInTheDocument();
    expect(
      await within(screen.getByRole("main")).findByText(/^seleccione un contexto de trabajo$/i),
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
    const user = setupUser();

    renderWithProviders(<App />, { route: "/login" });

    await user.type(
      await screen.findByRole("textbox", { name: /correo electr[oó]nico/i }),
      "mariana.rodriguez@example.edu",
    );
    await user.type(screen.getByLabelText(/contrase[nñ]a/i), "sipeg-demo");
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
      await screen.findByRole("heading", { level: 1, name: /descubra actividades academicas/i }),
    ).toBeInTheDocument();
    expect(useSessionStore.getState().currentUser).toBeNull();
    expect(screen.getByRole("link", { name: /iniciar sesi[oó]n/i })).toHaveAttribute(
      "href",
      "/login",
    );
  });

  it("should send standard users to their personal area after login", async () => {
    const user = setupUser();
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
      await screen.findByRole("textbox", { name: /correo electr[oó]nico/i }),
      "usuario@example.edu",
    );
    await user.type(screen.getByLabelText(/contrase[nñ]a/i), "sipeg-demo");
    await user.click(await screen.findByRole("button", { name: /iniciar sesi[oó]n/i }));

    expect(
      await screen.findByRole("heading", { level: 1, name: /[aá]rea personal/i }),
    ).toBeInTheDocument();
    expect(useSessionStore.getState().currentUser?.globalRole).toBe("USER");
    expect(
      screen.queryByRole("link", { name: /panel de administracion/i }),
    ).not.toBeInTheDocument();
  });

  it("should clear the working context when the session closes", async () => {
    const user = setupUser();
    useSessionStore.getState().setSession({ currentUser: demoUser, tokens: demoTokens });
    useWorkingContextStore
      .getState()
      .setWorkingContext({ id: "program-innovation-week", kind: "eventProgram" });
    useUnitPreferenceStore.getState().setSelectedUnitId("fisc");

    renderWithProviders(<App />, { route: "/admin" });

    await user.click(await screen.findByRole("button", { name: /cerrar sesi[oó]n/i }));

    expect(
      await screen.findByRole("heading", { level: 1, name: /descubra actividades academicas/i }),
    ).toBeInTheDocument();
    expect(useWorkingContextStore.getState().workingContext).toBeNull();
    expect(useUnitPreferenceStore.getState().selectedUnitId).toBe("all");
  });

  it("should keep non-admin users outside administrative routes and inside their personal area", async () => {
    useSessionStore.getState().setSession({
      currentUser: createAuthenticatedUser({ globalRole: "USER" }),
      tokens: demoTokens,
    });

    renderWithProviders(<App />, { route: "/admin" });

    expect(
      await screen.findByRole("heading", { level: 1, name: /[aá]rea personal/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /panel de administracion/i }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /cerrar sesi[oó]n/i })).toBeInTheDocument();
  });

  it("should redirect the password change route to login without a session", async () => {
    renderWithProviders(<App />, { route: "/cambiar-contrasena" });

    expect(
      await screen.findByRole("heading", { level: 1, name: /^iniciar sesi[oó]n$/i }),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText(/contraseña actual/i)).not.toBeInTheDocument();
  });

  it.each([{ globalRole: "ADMIN" }, { globalRole: "USER" }] satisfies {
    globalRole: GlobalRole;
  }[])("should allow the password change route to a %s session", async ({ globalRole }) => {
    useSessionStore.getState().setSession({
      currentUser: createAuthenticatedUser({ globalRole }),
      tokens: demoTokens,
    });

    renderWithProviders(<App />, { route: "/cambiar-contrasena" });

    expect(await screen.findByLabelText(/contraseña actual/i)).toBeInTheDocument();
    expect(await screen.findByLabelText(/^nueva contraseña/i)).toBeInTheDocument();
  });

  it("should not repeat the password change destination in the main menu", async () => {
    useSessionStore.getState().setSession({
      currentUser: createAuthenticatedUser({ globalRole: "USER" }),
      tokens: demoTokens,
    });

    renderWithProviders(<App />, { route: "/" });

    expect(await screen.findByRole("link", { name: /mi perfil/i })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /cambiar contrase[nñ]a/i })).not.toBeInTheDocument();
  });

  it("should mark the active personal destination for assistive technology", async () => {
    useSessionStore.getState().setSession({
      currentUser: createAuthenticatedUser({ globalRole: "USER" }),
      tokens: demoTokens,
    });

    renderWithProviders(<App />, { route: "/perfil" });

    expect(
      await screen.findByRole("link", { name: /mi perfil/i, current: "page" }),
    ).toHaveAttribute("href", "/perfil");
  });

  it("should not link the password change destination to anonymous visitors", async () => {
    renderWithProviders(<App />, { route: "/" });

    expect(await screen.findByRole("link", { name: /iniciar sesi[oó]n/i })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /cambiar contraseña/i })).not.toBeInTheDocument();
  });

  it("should redirect the profile route to login without a session", async () => {
    renderWithProviders(<App />, { route: "/perfil" });

    expect(
      await screen.findByRole("heading", { level: 1, name: /^iniciar sesi[oó]n$/i }),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText(/^nombre$/i)).not.toBeInTheDocument();
  });

  it.each([{ globalRole: "ADMIN" }, { globalRole: "USER" }] satisfies {
    globalRole: GlobalRole;
  }[])("should allow the profile route to a %s session", async ({ globalRole }) => {
    useSessionStore.getState().setSession({
      currentUser: createAuthenticatedUser({ globalRole }),
      tokens: demoTokens,
    });

    renderWithProviders(<App />, { route: "/perfil" });

    expect(
      await screen.findByRole("heading", { level: 1, name: /[aá]rea personal/i }),
    ).toBeInTheDocument();
    expect(await screen.findByLabelText(/^nombre$/i)).toBeInTheDocument();
  });

  it("should link the profile destination for every authenticated role", async () => {
    useSessionStore.getState().setSession({
      currentUser: createAuthenticatedUser({ globalRole: "USER" }),
      tokens: demoTokens,
    });

    renderWithProviders(<App />, { route: "/" });

    expect(await screen.findByRole("link", { name: /mi perfil/i })).toHaveAttribute(
      "href",
      "/perfil",
    );
  });

  it("should not link the profile destination to anonymous visitors", async () => {
    renderWithProviders(<App />, { route: "/" });

    expect(await screen.findByRole("link", { name: /iniciar sesi[oó]n/i })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /mi perfil/i })).not.toBeInTheDocument();
  });

  it("should open the account data section from the personal area index", async () => {
    useSessionStore.getState().setSession({
      currentUser: createAuthenticatedUser({ globalRole: "USER" }),
      tokens: demoTokens,
    });

    renderWithProviders(<App />, { route: "/perfil" });

    expect(
      await screen.findByRole("heading", { level: 1, name: /[aá]rea personal/i }),
    ).toBeInTheDocument();
    expect(await screen.findByLabelText(/^nombre$/i)).toBeInTheDocument();
    expect(
      await screen.findByRole("link", { current: "page", name: "Datos de la cuenta" }),
    ).toBeInTheDocument();
  });

  it("should redirect the password change route to the security section", async () => {
    useSessionStore.getState().setSession({
      currentUser: createAuthenticatedUser({ globalRole: "USER" }),
      tokens: demoTokens,
    });

    renderWithProviders(<App />, { route: "/cambiar-contrasena" });

    expect(await screen.findByLabelText(/contraseña actual/i)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { current: "page", name: "Seguridad de la cuenta" }),
    ).toBeInTheDocument();
  });

  it.each([
    ["datos", /mantenga sus datos al d[ií]a/i],
    ["seguridad", /cambie su contrase[nñ]a/i],
    ["actividades", /próximamente/i],
    ["certificados", /próximamente/i],
    ["alertas", /mis alertas/i],
  ] satisfies [string, RegExp][])(
    "should render /perfil/%s as an independent destination",
    async (section, heading) => {
      useSessionStore.getState().setSession({
        currentUser: createAuthenticatedUser({ globalRole: "USER" }),
        tokens: demoTokens,
      });

      renderWithProviders(<App />, { route: `/perfil/${section}` });

      expect(
        await screen.findByRole("heading", { level: 1, name: /[aá]rea personal/i }),
      ).toBeInTheDocument();
      expect(await screen.findByRole("heading", { level: 2, name: heading })).toBeInTheDocument();
      expect(
        screen.getByRole("navigation", { name: /secciones del [aá]rea personal/i }),
      ).toBeInTheDocument();
    },
  );

  it.each([{ globalRole: "ADMIN" }, { globalRole: "USER" }] satisfies {
    globalRole: GlobalRole;
  }[])("should protect every personal section for a %s session", async ({ globalRole }) => {
    useSessionStore.getState().setSession({
      currentUser: createAuthenticatedUser({ globalRole }),
      tokens: demoTokens,
    });

    renderWithProviders(<App />, { route: "/perfil/certificados" });

    expect(
      await screen.findByRole("heading", { level: 1, name: /[aá]rea personal/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { current: "page", name: "Mis certificados" }),
    ).toBeInTheDocument();
  });

  it.each(["datos", "seguridad", "actividades", "certificados", "alertas"])(
    "should redirect /perfil/%s to login without a session",
    async (section) => {
      renderWithProviders(<App />, { route: `/perfil/${section}` });

      expect(
        await screen.findByRole("heading", { level: 1, name: /^iniciar sesi[oó]n$/i }),
      ).toBeInTheDocument();
    },
  );

  it("should show only the selected section and keep the submenu available", async () => {
    useSessionStore.getState().setSession({
      currentUser: createAuthenticatedUser({ globalRole: "USER" }),
      tokens: demoTokens,
    });

    renderWithProviders(<App />, { route: "/perfil/seguridad" });

    expect(await screen.findByLabelText(/contraseña actual/i)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { current: "page", name: "Seguridad de la cuenta" }),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText(/^nombre$/i)).not.toBeInTheDocument();
  });

  it("should open the personal alerts inbox from the global indicator", async () => {
    const user = setupUser();
    useSessionStore.getState().setSession({
      currentUser: createAuthenticatedUser({ globalRole: "USER" }),
      tokens: demoTokens,
    });

    renderWithProviders(<App />, { route: "/perfil/datos" });

    await user.click(await screen.findByRole("link", { name: "Tienes 3 alertas sin leer" }));

    expect(
      await screen.findByRole("heading", { level: 2, name: "Mis alertas" }),
    ).toBeInTheDocument();
    const submenu = screen.getByRole("navigation", { name: /secciones del [aá]rea personal/i });

    expect(
      within(submenu).getByRole("link", { current: "page", name: "Mis alertas" }),
    ).toBeInTheDocument();
  });

  it("should keep the security section usable when the institutional catalog fails", async () => {
    useSessionStore.getState().setSession({
      currentUser: createAuthenticatedUser({ globalRole: "USER" }),
      tokens: demoTokens,
    });
    const adapters = createAppAdapters({ source: "mock" });
    const loadCareers = vi.fn().mockRejectedValue(new Error("catalog unavailable"));

    renderWithProviders(<App />, {
      adapters: { ...adapters, careers: { loadCareers } },
      route: "/perfil/seguridad",
    });

    expect(await screen.findByLabelText(/contraseña actual/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /reintentar/i })).not.toBeInTheDocument();
    expect(loadCareers).not.toHaveBeenCalled();
  });

  it("should move between sections by following the submenu", async () => {
    const user = setupUser();
    useSessionStore.getState().setSession({
      currentUser: createAuthenticatedUser({ globalRole: "USER" }),
      tokens: demoTokens,
    });

    renderWithProviders(<App />, { route: "/perfil/datos" });

    await user.click(await screen.findByRole("link", { name: "Mis actividades" }));

    expect(
      await screen.findByRole("heading", { level: 2, name: /próximamente/i }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("link", { name: "Datos de la cuenta" }));

    expect(await screen.findByLabelText(/^nombre$/i)).toBeInTheDocument();
  });

  it.each(personalAreaSections)(
    "should reach every other section from the submenu while on /perfil/$path",
    async (origin) => {
      const user = setupUser();
      useSessionStore.getState().setSession({
        currentUser: createAuthenticatedUser({ globalRole: "USER" }),
        tokens: demoTokens,
      });

      renderWithProviders(<App />, { route: `/perfil/${origin.path}` });

      await screen.findByRole("heading", { level: 1, name: /[aá]rea personal/i });
      const submenu = screen.getByRole("navigation", { name: /secciones del [aá]rea personal/i });

      for (const target of personalAreaSections.filter((section) => section.path !== origin.path)) {
        await user.click(within(submenu).getByRole("link", { name: target.label }));

        expect(await screen.findByText(target.content)).toBeInTheDocument();
        expect(
          within(submenu).getByRole("link", { current: "page", name: target.label }),
        ).toBeInTheDocument();
        expect(within(submenu).getAllByRole("link", { current: "page" })).toHaveLength(1);
      }
    },
  );

  it("should return to the previous section with the browser history", async () => {
    const user = setupUser();
    useSessionStore.getState().setSession({
      currentUser: createAuthenticatedUser({ globalRole: "USER" }),
      tokens: demoTokens,
    });

    renderWithProviders(
      <>
        <App />
        <HistoryProbe />
      </>,
      { route: "/perfil/datos" },
    );

    const submenu = await screen.findByRole("navigation", {
      name: /secciones del [aá]rea personal/i,
    });

    await user.click(within(submenu).getByRole("link", { name: "Mis actividades" }));
    expect(await screen.findByText(/inscripciones/i)).toBeInTheDocument();

    await user.click(within(submenu).getByRole("link", { name: "Seguridad de la cuenta" }));
    expect(await screen.findByLabelText(/contraseña actual/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /retroceder historial/i }));

    expect(await screen.findByText(/inscripciones/i)).toBeInTheDocument();
    expect(screen.getByTestId("history-path")).toHaveTextContent("/perfil/actividades");
    expect(
      within(submenu).getByRole("link", { current: "page", name: "Mis actividades" }),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText(/contraseña actual/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /avanzar historial/i }));

    expect(await screen.findByLabelText(/contraseña actual/i)).toBeInTheDocument();
    expect(screen.getByTestId("history-path")).toHaveTextContent("/perfil/seguridad");
    expect(
      within(submenu).getByRole("link", { current: "page", name: "Seguridad de la cuenta" }),
    ).toBeInTheDocument();
  });

  it("should reach every personal section from the submenu on mobile", async () => {
    const user = setupUser();
    stubDesktopViewport(false);
    useSessionStore.getState().setSession({
      currentUser: createAuthenticatedUser({ globalRole: "USER" }),
      tokens: demoTokens,
    });

    renderWithProviders(<App />, { route: "/perfil/datos" });

    expect(screen.queryByRole("link", { name: "Datos de la cuenta" })).not.toBeInTheDocument();
    expect(screen.getByText("Datos de la cuenta", { selector: "p" })).toBeVisible();
    expect(currentPersonalAreaSection()).toBe("Datos de la cuenta");

    for (const label of [
      "Seguridad de la cuenta",
      "Mis actividades",
      "Mis certificados",
      "Mis alertas",
    ]) {
      await user.click(screen.getByRole("button", { name: /ver todas las secciones/i }));

      const submenu = screen.getByRole("navigation", { name: /secciones del [aá]rea personal/i });

      await user.click(within(submenu).getByRole("link", { name: label }));

      expect(currentPersonalAreaSection()).toBe(label);
      expect(screen.getByRole("heading", { level: 1, name: /[aá]rea personal/i })).toHaveFocus();
      expect(screen.getByRole("button", { name: /ver todas las secciones/i })).toBeVisible();
      expect(within(submenu).queryByRole("link", { name: label })).not.toBeInTheDocument();
    }
  });

  it("should open the classroom detail route with its own path parameter", async () => {
    useSessionStore.getState().setSession({ currentUser: demoUser, tokens: demoTokens });

    renderWithProviders(<App />, { route: "/admin/aulas/aula-10" });

    expect(await screen.findByRole("heading", { level: 1, name: "Aula 10B" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: /disponibilidad semanal/i })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: /navegacion del panel/i })).toBeInTheDocument();
  });

  it("should keep the classroom detail route closed to a standard user", async () => {
    useSessionStore.getState().setSession({
      currentUser: createAuthenticatedUser({ globalRole: "USER", id: "user-2" }),
      tokens: demoTokens,
    });

    renderWithProviders(<App />, { route: "/admin/aulas/aula-10" });

    expect(
      await screen.findByRole("heading", { level: 1, name: /area personal/i }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 1, name: "Aula 10B" })).not.toBeInTheDocument();
  });
});
