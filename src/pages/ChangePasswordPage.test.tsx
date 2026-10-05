import { screen } from "@testing-library/react";
import { setupUser } from "@/test/user";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createAppAdapters, type AuthAdapter } from "@/app/adapters";
import { PasswordChangeError } from "@/features/auth";
import { useSessionStore } from "@/store/session";
import { useUnitPreferenceStore } from "@/store/unitPreference";
import { useWorkingContextStore } from "@/store/workingContext";
import { createAuthenticatedUser, createAuthTokens } from "@/test/factories";
import { renderWithProviders } from "@/test/render";

import { ChangePasswordPage } from "./ChangePasswordPage";

function createAuthSpy(overrides: Partial<AuthAdapter> = {}): AuthAdapter {
  return {
    changePassword: vi.fn().mockResolvedValue(undefined),
    loadCurrentUser: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
    refresh: vi.fn(),
    requestPasswordReset: vi.fn(),
    resetPassword: vi.fn(),
    updateCurrentUser: vi.fn(),
    verifyEmail: vi.fn(),
    ...overrides,
  };
}

function createAdaptersWithAuth(auth: AuthAdapter = createAuthSpy()) {
  return { ...createAppAdapters({ source: "mock" }), auth };
}

function authenticateSession() {
  const tokens = createAuthTokens();
  useSessionStore.getState().setSession({ currentUser: createAuthenticatedUser(), tokens });

  return tokens;
}

async function submitChange(user: ReturnType<typeof setupUser>) {
  await user.type(screen.getByLabelText(/contraseña actual/i), "sipeg-demo");
  await user.type(screen.getByLabelText(/^nueva contraseña/i), "Nueva clave 2026");
  await user.type(screen.getByLabelText(/confirmar contraseña/i), "Nueva clave 2026");
  await user.click(screen.getByRole("button", { name: /cambiar contraseña/i }));
}

describe("ChangePasswordPage", () => {
  beforeEach(() => {
    useSessionStore.getState().clearSession();
    useUnitPreferenceStore.getState().setSelectedUnitId("all");
    useWorkingContextStore.getState().clearWorkingContext();
    localStorage.clear();
    sessionStorage.clear();
  });

  it("should submit the current session credentials through the hook", async () => {
    const user = setupUser();
    const tokens = authenticateSession();
    const auth = createAuthSpy();
    renderWithProviders(<ChangePasswordPage />, { adapters: createAdaptersWithAuth(auth) });

    await submitChange(user);

    expect(await screen.findByText(/contraseña actualizada/i)).toBeInTheDocument();
    expect(auth.changePassword).toHaveBeenCalledWith(tokens.accessToken, {
      currentPassword: "sipeg-demo",
      newPassword: "Nueva clave 2026",
    });
  });

  it("should keep the session and explain that other sessions were closed", async () => {
    const user = setupUser();
    const tokens = authenticateSession();
    renderWithProviders(<ChangePasswordPage />, { adapters: createAdaptersWithAuth() });

    await submitChange(user);

    expect(await screen.findByText(/contraseña actualizada/i)).toBeInTheDocument();
    expect(screen.getByText(/otras sesiones/i)).toBeInTheDocument();
    expect(useSessionStore.getState().tokens).toEqual(tokens);
    expect(useSessionStore.getState().currentUser).not.toBeNull();
  });

  it("should remove the credentials from the page after a successful change", async () => {
    const user = setupUser();
    authenticateSession();
    const { container } = renderWithProviders(<ChangePasswordPage />, {
      adapters: createAdaptersWithAuth(),
    });

    await submitChange(user);

    expect(await screen.findByText(/contraseña actualizada/i)).toBeInTheDocument();
    expect(container.innerHTML).not.toContain("sipeg-demo");
    expect(container.innerHTML).not.toContain("Nueva clave 2026");
    expect(screen.queryByLabelText(/contraseña actual/i)).not.toBeInTheDocument();
  });

  it("should explain an invalid change and keep the typed values", async () => {
    const user = setupUser();
    authenticateSession();
    const auth = createAuthSpy({
      changePassword: vi.fn().mockRejectedValue(new PasswordChangeError("invalid")),
    });
    renderWithProviders(<ChangePasswordPage />, { adapters: createAdaptersWithAuth(auth) });

    await submitChange(user);

    expect(await screen.findByRole("alert")).toHaveTextContent(/contraseña actual/i);
    expect(screen.getByLabelText(/^nueva contraseña/i)).toHaveValue("Nueva clave 2026");
  });

  it("should never reveal a backend message for an unexpected failure", async () => {
    const user = setupUser();
    authenticateSession();
    const auth = createAuthSpy({
      changePassword: vi.fn().mockRejectedValue(new Error("current password mismatch in database")),
    });
    renderWithProviders(<ChangePasswordPage />, { adapters: createAdaptersWithAuth(auth) });

    await submitChange(user);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /no fue posible cambiar la contraseña/i,
    );
    expect(document.body.innerHTML).not.toContain("database");
  });

  it("should report a throttled attempt", async () => {
    const user = setupUser();
    authenticateSession();
    const auth = createAuthSpy({
      changePassword: vi.fn().mockRejectedValue(new PasswordChangeError("throttled")),
    });
    renderWithProviders(<ChangePasswordPage />, { adapters: createAdaptersWithAuth(auth) });

    await submitChange(user);

    expect(await screen.findByRole("alert")).toHaveTextContent(/demasiados intentos/i);
  });

  it("should report an expired session", async () => {
    const user = setupUser();
    authenticateSession();
    const auth = createAuthSpy({
      changePassword: vi.fn().mockRejectedValue(new PasswordChangeError("unauthenticated")),
    });
    renderWithProviders(<ChangePasswordPage />, { adapters: createAdaptersWithAuth(auth) });

    await submitChange(user);

    expect(await screen.findByRole("alert")).toHaveTextContent(/inicie sesión nuevamente/i);
  });

  it("should never render the session credentials in the page", () => {
    const tokens = authenticateSession();
    const { container } = renderWithProviders(<ChangePasswordPage />, {
      adapters: createAdaptersWithAuth(),
    });

    expect(container.innerHTML).not.toContain(tokens.accessToken);
    expect(container.innerHTML).not.toContain(tokens.accessToken);
    expect(sessionStorage.length).toBe(0);
  });

  it("should render the password form without its own route heading", () => {
    authenticateSession();
    renderWithProviders(<ChangePasswordPage />, { adapters: createAdaptersWithAuth() });

    expect(
      screen.getByRole("heading", { level: 2, name: /cambie su contrase[nñ]a/i }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 1 })).not.toBeInTheDocument();
  });

  it("should not read the institutional catalog, so a catalog failure cannot hide it", async () => {
    const loadCareers = vi.fn().mockRejectedValue(new Error("catalog unavailable"));
    const loadOrganizationalUnits = vi.fn().mockRejectedValue(new Error("catalog unavailable"));

    renderWithProviders(<ChangePasswordPage />, {
      adapters: {
        ...createAppAdapters({ source: "mock" }),
        careers: { loadCareers },
        organizationalUnits: { loadOrganizationalUnits },
      },
    });

    expect(await screen.findByLabelText(/contraseña actual/i)).toBeInTheDocument();
    expect(loadCareers).not.toHaveBeenCalled();
    expect(loadOrganizationalUnits).not.toHaveBeenCalled();
  });
});
