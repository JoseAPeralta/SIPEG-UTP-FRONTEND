import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createAppAdapters, type AuthAdapter, type RegistrationAdapter } from "@/app/adapters";
import { ProfileUpdateError } from "@/features/auth";
import { useSessionStore } from "@/store/session";
import { useUnitPreferenceStore } from "@/store/unitPreference";
import { useWorkingContextStore } from "@/store/workingContext";
import { createAuthenticatedUser, createAuthTokens } from "@/test/factories";
import { renderWithProviders } from "@/test/render";
import type { RegistrationCatalog } from "@/types/domain";

import { ProfileView } from "./ProfileView";

const catalog: RegistrationCatalog = {
  careers: [
    { code: "CIVIL", id: "civil", name: "Ingenieria Civil", unitId: "fic" },
    { code: "SOFTWARE", id: "software", name: "Desarrollo de Software", unitId: "fisc" },
    { code: "OTROS", id: "otros", name: "Otros", unitId: null },
  ],
  organizationalUnits: [
    {
      code: "FIC",
      description: null,
      head: null,
      id: "fic",
      isActive: true,
      name: "Facultad de Ingenieria Civil",
      type: "FACULTY",
    },
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

function createAuthSpy(overrides: Partial<AuthAdapter> = {}): AuthAdapter {
  return {
    changePassword: vi.fn(),
    loadCurrentUser: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
    refresh: vi.fn(),
    requestPasswordReset: vi.fn(),
    resetPassword: vi.fn(),
    updateCurrentUser: vi.fn().mockResolvedValue(createAuthenticatedUser()),
    verifyEmail: vi.fn(),
    ...overrides,
  };
}

function createRegistrationSpy(overrides: Partial<RegistrationAdapter> = {}): RegistrationAdapter {
  return {
    loadCatalog: vi.fn().mockResolvedValue(catalog),
    register: vi.fn(),
    ...overrides,
  };
}

function createAdapters(
  overrides: {
    auth?: AuthAdapter;
    registration?: RegistrationAdapter;
  } = {},
) {
  return {
    ...createAppAdapters({ source: "mock" }),
    auth: overrides.auth ?? createAuthSpy(),
    registration: overrides.registration ?? createRegistrationSpy(),
  };
}

function authenticateSession() {
  const currentUser = createAuthenticatedUser({
    career: { code: "SOFTWARE", id: "software", name: "Desarrollo de Software" },
    firstName: "Mariana",
    unit: { code: "FISC", id: "fisc", name: "Facultad de Ingenieria de Sistemas" },
  });
  const tokens = createAuthTokens();
  useSessionStore.getState().setSession({ currentUser, tokens });

  return tokens;
}

describe("ProfileView", () => {
  beforeEach(() => {
    useSessionStore.getState().clearSession();
    useUnitPreferenceStore.getState().setSelectedUnitId("all");
    useWorkingContextStore.getState().clearWorkingContext();
    localStorage.clear();
    sessionStorage.clear();
  });

  it("should announce the catalog loading state", () => {
    authenticateSession();
    const registration = createRegistrationSpy({
      loadCatalog: vi.fn<() => Promise<RegistrationCatalog>>(() => new Promise(() => undefined)),
    });

    renderWithProviders(<ProfileView />, { adapters: createAdapters({ registration }) });

    expect(screen.getByText(/cargando/i)).toBeInTheDocument();
  });

  it("should offer a retry when the catalog fails", async () => {
    const user = userEvent.setup();
    authenticateSession();
    const loadCatalog = vi.fn().mockRejectedValueOnce(new Error("boom")).mockResolvedValue(catalog);
    const registration = createRegistrationSpy({ loadCatalog });

    renderWithProviders(<ProfileView />, { adapters: createAdapters({ registration }) });

    await user.click(await screen.findByRole("button", { name: /reintentar/i }));

    expect(await screen.findByLabelText(/nombre/i)).toHaveValue("Mariana");
    expect(loadCatalog).toHaveBeenCalledTimes(2);
  });

  it("should render nothing when there is no authenticated profile", () => {
    renderWithProviders(<ProfileView />);

    expect(screen.queryByLabelText(/nombre/i)).not.toBeInTheDocument();
  });

  it("should render the form with the stored profile", async () => {
    authenticateSession();
    renderWithProviders(<ProfileView />);

    expect(await screen.findByLabelText(/nombre/i)).toHaveValue("Mariana");
    expect(screen.getByLabelText(/apellido/i)).toHaveValue("Rodriguez");
  });

  it("should submit the contracted patch and confirm the update", async () => {
    const user = userEvent.setup();
    const tokens = authenticateSession();
    const updated = createAuthenticatedUser({ firstName: "Mariana Paula" });
    const auth = createAuthSpy({ updateCurrentUser: vi.fn().mockResolvedValue(updated) });
    renderWithProviders(<ProfileView />, { adapters: createAdapters({ auth }) });

    await user.clear(await screen.findByLabelText(/nombre/i));
    await user.type(screen.getByLabelText(/nombre/i), "Mariana Paula");
    await user.click(screen.getByRole("button", { name: /guardar cambios/i }));

    expect(auth.updateCurrentUser).toHaveBeenCalledWith(tokens.accessToken, {
      firstName: "Mariana Paula",
    });
    expect(await screen.findByRole("status")).toHaveTextContent(/perfil fue actualizado/i);
    expect(useSessionStore.getState().currentUser).toEqual(updated);
  });

  it("should report a conflict without revealing the backend message", async () => {
    const user = userEvent.setup();
    authenticateSession();
    const auth = createAuthSpy({
      updateCurrentUser: vi.fn().mockRejectedValue(new ProfileUpdateError("conflict")),
    });
    renderWithProviders(<ProfileView />, { adapters: createAdapters({ auth }) });

    await user.clear(await screen.findByLabelText(/nombre/i));
    await user.type(screen.getByLabelText(/nombre/i), "Mariana Paula");
    await user.click(screen.getByRole("button", { name: /guardar cambios/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/otra sesión/i);
    expect(document.body.innerHTML).not.toContain("career");
  });

  it("should end the session when the server rejects the access token", async () => {
    const user = userEvent.setup();
    authenticateSession();
    const auth = createAuthSpy({
      updateCurrentUser: vi.fn().mockRejectedValue(new ProfileUpdateError("unauthenticated")),
    });
    renderWithProviders(<ProfileView />, { adapters: createAdapters({ auth }) });

    await user.clear(await screen.findByLabelText(/nombre/i));
    await user.type(screen.getByLabelText(/nombre/i), "Mariana Paula");
    await user.click(screen.getByRole("button", { name: /guardar cambios/i }));

    await waitFor(() => expect(useSessionStore.getState().status).toBe("anonymous"));
    expect(useSessionStore.getState().tokens).toBeNull();
    expect(useSessionStore.getState().sessionEndReason).toBe("expired");
    expect(sessionStorage.length).toBe(0);
  });

  it("should stop rendering the form once the session is gone", async () => {
    const user = userEvent.setup();
    authenticateSession();
    const auth = createAuthSpy({
      updateCurrentUser: vi.fn().mockRejectedValue(new ProfileUpdateError("unauthenticated")),
    });
    renderWithProviders(<ProfileView />, { adapters: createAdapters({ auth }) });

    await user.clear(await screen.findByLabelText(/nombre/i));
    await user.type(screen.getByLabelText(/nombre/i), "Mariana Paula");
    await user.click(screen.getByRole("button", { name: /guardar cambios/i }));

    await waitFor(() => expect(screen.queryByLabelText(/nombre/i)).toBeNull());
  });

  it("should keep the session when the update fails for another reason", async () => {
    const user = userEvent.setup();
    const tokens = authenticateSession();
    const auth = createAuthSpy({
      updateCurrentUser: vi.fn().mockRejectedValue(new ProfileUpdateError("invalid")),
    });
    renderWithProviders(<ProfileView />, { adapters: createAdapters({ auth }) });

    await user.clear(await screen.findByLabelText(/nombre/i));
    await user.type(screen.getByLabelText(/nombre/i), "Mariana Paula");
    await user.click(screen.getByRole("button", { name: /guardar cambios/i }));

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(useSessionStore.getState().tokens).toEqual(tokens);
    expect(useSessionStore.getState().sessionEndReason).toBeNull();
  });

  it("should never render the access or refresh token", async () => {
    const tokens = authenticateSession();
    const { container } = renderWithProviders(<ProfileView />);

    await screen.findByLabelText(/nombre/i);

    expect(container.innerHTML).not.toContain(tokens.accessToken);
    // El refresh token no existe en el cliente (vive en la cookie HttpOnly), y el
    // access token tampoco puede quedar renderizado.
    expect(container.innerHTML).not.toContain(tokens.accessToken);
    expect(sessionStorage.length).toBe(0);
  });
});
