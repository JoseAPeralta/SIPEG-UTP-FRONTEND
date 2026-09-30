import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { createAppAdapters, type AuthAdapter } from "@/app/adapters";
import { PasswordRecoveryError } from "@/features/auth";
import { renderWithProviders } from "@/test/render";

import { ResetPasswordPage } from "./ResetPasswordPage";

function createAuthSpy(overrides: Partial<AuthAdapter> = {}): AuthAdapter {
  return {
    changePassword: vi.fn(),
    loadCurrentUser: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
    refresh: vi.fn(),
    requestPasswordReset: vi.fn(),
    resetPassword: vi.fn().mockResolvedValue(undefined),
    updateCurrentUser: vi.fn(),
    verifyEmail: vi.fn(),
    ...overrides,
  };
}

function createAdaptersWithAuth(auth: AuthAdapter) {
  return { ...createAppAdapters({ source: "mock" }), auth };
}

async function submitNewPassword(
  user: ReturnType<typeof userEvent.setup>,
  password = "Nueva clave 2026",
) {
  await user.type(screen.getByLabelText(/nueva contrase[nñ]a/i), password);
  await user.type(screen.getByLabelText(/confirmar contrase[nñ]a/i), password);
  await user.click(screen.getByRole("button", { name: /restablecer contraseña/i }));
}

describe("ResetPasswordPage", () => {
  it("should remove the token from the address bar without submitting it", async () => {
    const auth = createAuthSpy({
      resetPassword: vi.fn(() => new Promise<void>(() => undefined)),
    });
    renderWithProviders(<ResetPasswordPage />, {
      adapters: createAdaptersWithAuth(auth),
      route: "/reset-password?token=reset-token",
    });

    await waitFor(() => expect(window.location.search).toBe(""));
    expect(auth.resetPassword).not.toHaveBeenCalled();
  });

  it("should decode a token that arrives percent-encoded", async () => {
    const user = userEvent.setup();
    const auth = createAuthSpy();
    renderWithProviders(<ResetPasswordPage />, {
      adapters: createAdaptersWithAuth(auth),
      route: "/reset-password?token=abc%2B123%2F%3D",
    });

    await submitNewPassword(user);

    await waitFor(() => expect(auth.resetPassword).toHaveBeenCalled());
    expect(auth.resetPassword).toHaveBeenCalledWith({
      newPassword: "Nueva clave 2026",
      token: "abc+123/=",
    });
  });

  it("should show an actionable state when the token is missing", () => {
    const auth = createAuthSpy();
    renderWithProviders(<ResetPasswordPage />, {
      adapters: createAdaptersWithAuth(auth),
      route: "/reset-password",
    });

    expect(screen.getByRole("alert")).toHaveTextContent(/enlace para restablecer/i);
    expect(screen.queryByLabelText(/nueva contrase[nñ]a/i)).not.toBeInTheDocument();
    expect(auth.resetPassword).not.toHaveBeenCalled();
  });

  it("should explain that the link is invalid or expired", async () => {
    const user = userEvent.setup();
    const auth = createAuthSpy({
      resetPassword: vi.fn().mockRejectedValue(new PasswordRecoveryError("invalid")),
    });
    renderWithProviders(<ResetPasswordPage />, {
      adapters: createAdaptersWithAuth(auth),
      route: "/reset-password?token=expirado",
    });

    await submitNewPassword(user);

    expect(await screen.findByRole("alert")).toHaveTextContent(/inv[aá]lido o ha expirado/i);
  });

  it("should explain throttling separately from an expired link", async () => {
    const user = userEvent.setup();
    const auth = createAuthSpy({
      resetPassword: vi.fn().mockRejectedValue(new PasswordRecoveryError("throttled")),
    });
    renderWithProviders(<ResetPasswordPage />, {
      adapters: createAdaptersWithAuth(auth),
      route: "/reset-password?token=reset-token",
    });

    await submitNewPassword(user);

    expect(await screen.findByRole("alert")).toHaveTextContent(/demasiados intentos/i);
  });

  it("should keep the form available after a recoverable failure", async () => {
    const user = userEvent.setup();
    const auth = createAuthSpy({
      resetPassword: vi.fn().mockRejectedValue(new PasswordRecoveryError("invalid")),
    });
    renderWithProviders(<ResetPasswordPage />, {
      adapters: createAdaptersWithAuth(auth),
      route: "/reset-password?token=expirado",
    });

    await submitNewPassword(user);

    expect(await screen.findByLabelText(/nueva contrase[nñ]a/i)).toHaveValue("Nueva clave 2026");
  });

  it("should keep the token usable when the component mounts twice", async () => {
    const user = userEvent.setup();
    const auth = createAuthSpy();
    const { rerender } = renderWithProviders(<ResetPasswordPage />, {
      adapters: createAdaptersWithAuth(auth),
      route: "/reset-password?token=reset-token",
    });

    rerender(<ResetPasswordPage />);
    await submitNewPassword(user);

    await waitFor(() =>
      expect(auth.resetPassword).toHaveBeenCalledWith({
        newPassword: "Nueva clave 2026",
        token: "reset-token",
      }),
    );
  });

  it("should never expose the token in the document or the address bar", async () => {
    const user = userEvent.setup();
    const auth = createAuthSpy({
      resetPassword: vi.fn().mockRejectedValue(new PasswordRecoveryError("invalid")),
    });
    renderWithProviders(<ResetPasswordPage />, {
      adapters: createAdaptersWithAuth(auth),
      route: "/reset-password?token=token-secreto-123",
    });

    await submitNewPassword(user);
    await screen.findByRole("alert");

    expect(document.body.innerHTML).not.toContain("token-secreto-123");
    expect(window.location.href).not.toContain("token-secreto-123");
  });
});
