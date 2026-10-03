import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { App } from "@/App";
import { createAppAdapters, type AuthAdapter, type RegistrationAdapter } from "@/app/adapters";
import type { ProfileUpdateRequest } from "@/app/adapters/contracts";
import { createQueryClient, QUERY_CACHE_STORAGE_KEY, queryKeys } from "@/app/query";
import { useSessionStore } from "@/store/session";
import { useUnitPreferenceStore } from "@/store/unitPreference";
import { useWorkingContextStore } from "@/store/workingContext";
import { createAuthTokens } from "@/test/factories";
import { renderWithProviders } from "@/test/render";
import { stubDesktopViewport } from "@/test/viewport";
import type {
  AuthenticatedUser,
  AuthTokens,
  RegistrationCatalog,
  RegistrationPayload,
} from "@/types/domain";

const PARTICIPANT_EMAIL = "participante@example.edu";
const PARTICIPANT_PASSWORD = "Sipeg-demo-2026";
const VERIFICATION_TOKEN = "verification-token-1";
const NEW_PASSWORD = "Nueva clave 2026";

const catalog: RegistrationCatalog = {
  careers: [
    { code: "SOFTWARE", id: "software", name: "Desarrollo de Software", unitId: "fisc" },
    { code: "OTROS", id: "otros", name: "Otros", unitId: null },
  ],
  organizationalUnits: [
    {
      code: "FISC",
      description: null,
      head: null,
      id: "fisc",
      isActive: true,
      name: "Facultad de Ingenieria de Sistemas",
      type: "FACULTY",
    },
  ],
};

const initialParticipant: AuthenticatedUser = {
  career: { code: "SOFTWARE", id: "software", name: "Desarrollo de Software" },
  email: PARTICIPANT_EMAIL,
  firstName: "Mariana",
  globalRole: "USER",
  id: "participant-1",
  identificationNumber: "8-123-456",
  lastName: "Rodriguez",
  unit: { code: "FISC", id: "fisc", name: "Facultad de Ingenieria de Sistemas" },
};

const journeyTokens: AuthTokens = createAuthTokens({
  accessToken: "journey-access-token",
});

/** Only the four contracted attributes ever reach the stored profile, mirroring the adapter allowlist. */
function allowlistedProfilePatch(request: ProfileUpdateRequest): Partial<AuthenticatedUser> {
  const patch: Partial<AuthenticatedUser> = {};

  if (request.firstName !== undefined) patch.firstName = request.firstName;
  if (request.lastName !== undefined) patch.lastName = request.lastName;

  if (request.unitId === null) {
    patch.career = { code: "OTROS", id: "otros", name: "Otros" };
    patch.unit = null;
  }

  if (typeof request.unitId === "string") {
    patch.unit = { code: "FISC", id: request.unitId, name: "Facultad de Ingenieria de Sistemas" };
  }

  return patch;
}

/**
 * The backend is the authority of the profile, so the journey holds one person instead of a fixed
 * answer. Registering, signing in, restoring and updating all read and write the same record, which is
 * what makes a profile edited in the form the one the next request returns.
 */
function createScenario() {
  const profile: { current: AuthenticatedUser } = { current: initialParticipant };
  const registered: { payload: RegistrationPayload | null } = { payload: null };

  const registration: RegistrationAdapter = {
    register: vi.fn((payload: RegistrationPayload) => {
      registered.payload = payload;

      return Promise.resolve({ userId: profile.current.id });
    }),
  };

  const auth: AuthAdapter = {
    changePassword: vi.fn().mockResolvedValue(undefined),
    loadCurrentUser: vi.fn().mockImplementation(() => Promise.resolve({ ...profile.current })),
    login: vi.fn().mockImplementation(({ email, password }) => {
      if (email !== profile.current.email || password !== PARTICIPANT_PASSWORD) {
        return Promise.reject(new Error("credenciales incorrectas"));
      }

      return Promise.resolve(journeyTokens);
    }),
    logout: vi.fn().mockResolvedValue(undefined),
    refresh: vi.fn().mockResolvedValue(journeyTokens),
    requestPasswordReset: vi.fn().mockResolvedValue(undefined),
    resetPassword: vi.fn().mockResolvedValue(undefined),
    updateCurrentUser: vi.fn<AuthAdapter["updateCurrentUser"]>((_accessToken, request) => {
      profile.current = { ...profile.current, ...allowlistedProfilePatch(request) };

      return Promise.resolve({ ...profile.current });
    }),
    verifyEmail: vi.fn().mockResolvedValue(undefined),
  };

  return {
    adapters: {
      ...createAppAdapters({ source: "mock" }),
      auth,
      careers: { loadCareers: vi.fn().mockResolvedValue(catalog.careers) },
      organizationalUnits: {
        loadOrganizationalUnits: vi.fn().mockResolvedValue(catalog.organizationalUnits),
      },
      registration,
    },
    auth,
    profile,
    queryClient: createQueryClient({ defaultOptions: { queries: { retry: false } } }),
    registered,
    registration,
  };
}

async function registerThroughTheForm(user: ReturnType<typeof userEvent.setup>) {
  await user.selectOptions(
    await screen.findByRole("combobox", { name: /unidad \/ facultad/i }),
    "fisc",
  );
  await user.selectOptions(screen.getByRole("combobox", { name: /carrera/i }), "software");
  await user.type(screen.getByRole("textbox", { name: /^nombre$/i }), "Mariana");
  await user.type(screen.getByRole("textbox", { name: /^apellido$/i }), "Rodriguez");
  await user.type(screen.getByRole("textbox", { name: /c[eé]dula/i }), "8-123-456");
  await user.type(
    screen.getByRole("textbox", { name: /correo electr[oó]nico/i }),
    PARTICIPANT_EMAIL,
  );
  await user.type(screen.getByLabelText(/^contrase[nñ]a$/i), PARTICIPANT_PASSWORD);
  await user.click(screen.getByRole("button", { name: /crear cuenta/i }));
}

async function signInThroughTheForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(
    await screen.findByRole("textbox", { name: /correo electr[oó]nico/i }),
    PARTICIPANT_EMAIL,
  );
  await user.type(screen.getByLabelText(/^contraseña$/i), PARTICIPANT_PASSWORD);
  await user.click(screen.getByRole("button", { name: /^iniciar sesi[oó]n$/i }));
}

async function signInAndOpenAccountData(
  user: ReturnType<typeof userEvent.setup>,
  scenario: ReturnType<typeof createScenario>,
) {
  const renderResult = renderWithProviders(<App />, {
    adapters: scenario.adapters,
    queryClient: scenario.queryClient,
    route: "/login",
  });
  await signInThroughTheForm(user);
  await screen.findByLabelText(/^nombre$/i);

  return renderResult;
}

function readAllBrowserStorage(): string {
  return [...Object.keys(localStorage), ...Object.keys(sessionStorage)]
    .flatMap((key) => [localStorage.getItem(key) ?? "", sessionStorage.getItem(key) ?? ""])
    .join("\n");
}

describe("App account journey", () => {
  beforeEach(() => {
    stubDesktopViewport(true);
    useSessionStore.getState().clearSession();
    useUnitPreferenceStore.getState().setSelectedUnitId("all");
    useWorkingContextStore.getState().clearWorkingContext();
    localStorage.clear();
    sessionStorage.clear();
  });

  it("should create the account and ask for the email verification without signing in", async () => {
    const user = userEvent.setup();
    const scenario = createScenario();

    renderWithProviders(<App />, { adapters: scenario.adapters, route: "/registro" });

    await registerThroughTheForm(user);

    expect(await screen.findByText(/cuenta creada correctamente/i)).toBeInTheDocument();
    expect(scenario.registration.register).toHaveBeenCalledWith({
      careerId: "software",
      email: PARTICIPANT_EMAIL,
      firstName: "Mariana",
      identificationNumber: "8-123-456",
      lastName: "Rodriguez",
      password: PARTICIPANT_PASSWORD,
      unitId: "fisc",
    });
    expect(useSessionStore.getState().status).toBe("anonymous");
    expect(sessionStorage.length).toBe(0);
  });

  it("should verify the account from the email link and land on the login invitation", async () => {
    const scenario = createScenario();
    const registerMount = renderWithProviders(<App />, {
      adapters: scenario.adapters,
      queryClient: scenario.queryClient,
      route: "/registro",
    });

    await registerThroughTheForm(userEvent.setup());
    await screen.findByText(/cuenta creada correctamente/i);
    registerMount.unmount();

    renderWithProviders(<App />, {
      adapters: scenario.adapters,
      queryClient: createQueryClient({ defaultOptions: { queries: { retry: false } } }),
      route: `/verify-email?token=${VERIFICATION_TOKEN}`,
    });

    expect(await screen.findByText(/cuenta ha sido activada.*inicie sesion/i)).toBeInTheDocument();
    expect(scenario.auth.verifyEmail).toHaveBeenCalledWith(VERIFICATION_TOKEN);
    expect(window.location.search).toBe("");
  });

  it("should sign in with the registered credentials and open the account data section", async () => {
    const user = userEvent.setup();
    const scenario = createScenario();

    renderWithProviders(<App />, { adapters: scenario.adapters, route: "/login" });

    await signInThroughTheForm(user);

    expect(
      await screen.findByRole("heading", { level: 1, name: /[aá]rea personal/i }),
    ).toBeInTheDocument();
    expect(await screen.findByLabelText(/^nombre$/i)).toHaveValue("Mariana");
    expect(scenario.auth.login).toHaveBeenCalledWith({
      email: PARTICIPANT_EMAIL,
      password: PARTICIPANT_PASSWORD,
    });
    expect(scenario.auth.loadCurrentUser).toHaveBeenCalledWith(journeyTokens.accessToken);
    expect(useSessionStore.getState()).toMatchObject({
      currentUser: initialParticipant,
      status: "authenticated",
    });
    // El refresh token viaja en una cookie HttpOnly: el navegador lo guarda y lo
    // envia, y este codigo no lo toca. No queda nada en el almacenamiento web.
    expect(readAllBrowserStorage()).not.toContain(journeyTokens.refreshTokenExpiresAt);
    expect(sessionStorage.length).toBe(0);
  });

  it("should save the editable profile and show it again after returning from another section", async () => {
    const user = userEvent.setup();
    const scenario = createScenario();

    await signInAndOpenAccountData(user, scenario);

    await user.clear(screen.getByLabelText(/^nombre$/i));
    await user.type(screen.getByLabelText(/^nombre$/i), "Mariana Paula");
    await user.click(screen.getByRole("button", { name: /guardar cambios/i }));

    expect(await screen.findByRole("status")).toHaveTextContent(/perfil fue actualizado/i);
    expect(scenario.auth.updateCurrentUser).toHaveBeenCalledWith(journeyTokens.accessToken, {
      firstName: "Mariana Paula",
    });
    expect(useSessionStore.getState().currentUser?.firstName).toBe("Mariana Paula");

    const submenu = screen.getByRole("navigation", { name: /secciones del [aá]rea personal/i });

    await user.click(within(submenu).getByRole("link", { name: "Seguridad de la cuenta" }));
    await screen.findByLabelText(/contraseña actual/i);

    await user.click(within(submenu).getByRole("link", { name: "Datos de la cuenta" }));

    expect(await screen.findByLabelText(/^nombre$/i)).toHaveValue("Mariana Paula");
    expect(scenario.auth.updateCurrentUser).toHaveBeenCalledTimes(1);
  });

  it("should change the password from the security section and keep the current session", async () => {
    const user = userEvent.setup();
    const scenario = createScenario();

    await signInAndOpenAccountData(user, scenario);

    const submenu = screen.getByRole("navigation", { name: /secciones del [aá]rea personal/i });

    await user.click(within(submenu).getByRole("link", { name: "Seguridad de la cuenta" }));

    await user.type(await screen.findByLabelText(/contraseña actual/i), PARTICIPANT_PASSWORD);
    await user.type(screen.getByLabelText(/^nueva contraseña/i), NEW_PASSWORD);
    await user.type(screen.getByLabelText(/confirmar contraseña/i), NEW_PASSWORD);
    await user.click(screen.getByRole("button", { name: /^cambiar contraseña$/i }));

    expect(await screen.findByText(/contraseña actualizada/i)).toBeInTheDocument();
    expect(scenario.auth.changePassword).toHaveBeenCalledWith(journeyTokens.accessToken, {
      currentPassword: PARTICIPANT_PASSWORD,
      newPassword: NEW_PASSWORD,
    });
    expect(useSessionStore.getState()).toMatchObject({
      status: "authenticated",
      tokens: journeyTokens,
    });
    expect(document.body.innerHTML).not.toContain(NEW_PASSWORD);
  });

  it("should close the session, discard private data and block the personal area again", async () => {
    const user = userEvent.setup();
    const scenario = createScenario();
    const { unmount } = await signInAndOpenAccountData(user, scenario);

    scenario.queryClient.setQueryData(queryKeys.operations("participant-1"), { private: true });
    scenario.queryClient.setQueryData(queryKeys.administrativeActivityCatalog("participant-1"), {
      private: true,
    });
    localStorage.setItem(QUERY_CACHE_STORAGE_KEY, '{"cached":true}');
    useUnitPreferenceStore.getState().setSelectedUnitId("fisc");
    useWorkingContextStore.getState().setWorkingContext({ id: "program-1", kind: "eventProgram" });

    await user.click(screen.getByRole("button", { name: /cerrar sesi[oó]n/i }));

    expect(
      await screen.findByRole("heading", { level: 1, name: /descubra actividades academicas/i }),
    ).toBeInTheDocument();
    expect(scenario.auth.logout).toHaveBeenCalled();
    expect(useSessionStore.getState().status).toBe("anonymous");
    expect(useSessionStore.getState().tokens).toBeNull();
    expect(useSessionStore.getState().currentUser).toBeNull();
    expect(sessionStorage.length).toBe(0);
    expect(localStorage.getItem(QUERY_CACHE_STORAGE_KEY)).toBeNull();
    expect(useWorkingContextStore.getState().workingContext).toBeNull();
    expect(useUnitPreferenceStore.getState().selectedUnitId).toBe("all");
    expect(
      scenario.queryClient.getQueryData(queryKeys.operations("participant-1")),
    ).toBeUndefined();
    expect(
      scenario.queryClient.getQueryData(queryKeys.administrativeActivityCatalog("participant-1")),
    ).toBeUndefined();
    expect(document.body.innerHTML).not.toContain(journeyTokens.accessToken);
    expect(screen.queryByRole("link", { name: /mi perfil/i })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /iniciar sesi[oó]n/i })).toBeInTheDocument();

    unmount();

    renderWithProviders(<App />, {
      adapters: scenario.adapters,
      queryClient: scenario.queryClient,
      route: "/perfil/datos",
    });

    expect(
      await screen.findByRole("heading", { level: 1, name: /^iniciar sesi[oó]n$/i }),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText(/^nombre$/i)).not.toBeInTheDocument();
  });

  it("should never write credentials, profile or verification material to the browser storage", async () => {
    const user = userEvent.setup();
    const scenario = createScenario();
    const registerMount = renderWithProviders(<App />, {
      adapters: scenario.adapters,
      route: "/registro",
    });

    await registerThroughTheForm(user);
    await screen.findByText(/cuenta creada correctamente/i);

    expect(readAllBrowserStorage()).not.toContain(PARTICIPANT_PASSWORD);
    registerMount.unmount();

    renderWithProviders(<App />, {
      adapters: scenario.adapters,
      route: `/verify-email?token=${VERIFICATION_TOKEN}`,
    });

    await screen.findByText(/cuenta ha sido activada.*inicie sesion/i);
    expect(readAllBrowserStorage()).not.toContain(VERIFICATION_TOKEN);

    await signInThroughTheForm(user);
    await screen.findByLabelText(/^nombre$/i);

    const storage = readAllBrowserStorage();

    expect(storage).not.toContain(journeyTokens.accessToken);
    expect(storage).not.toContain(PARTICIPANT_PASSWORD);
    expect(storage).not.toContain(PARTICIPANT_EMAIL);
    expect(storage).not.toContain("8-123-456");
    // Ninguna credencial de sesion queda en el almacenamiento del navegador, ni
    // siquiera la expiracion: la cookie es lo unico que la conserva.
    expect(storage.trim()).toBe("");
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
    expect(document.body.innerHTML).not.toContain(journeyTokens.accessToken);
  });
});
