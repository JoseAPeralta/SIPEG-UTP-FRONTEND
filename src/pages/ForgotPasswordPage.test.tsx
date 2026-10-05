import { screen, waitFor } from "@testing-library/react";
import { setupUser } from "@/test/user";
import { describe, expect, it, vi } from "vitest";

import { createAppAdapters, type AuthAdapter } from "@/app/adapters";
import { PasswordRecoveryError } from "@/features/auth";
import { renderWithProviders } from "@/test/render";

import { ForgotPasswordPage } from "./ForgotPasswordPage";

function createAuthSpy(overrides: Partial<AuthAdapter> = {}): AuthAdapter {
  return {
    changePassword: vi.fn(),
    loadCurrentUser: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
    refresh: vi.fn(),
    requestPasswordReset: vi.fn().mockResolvedValue(undefined),
    resetPassword: vi.fn(),
    updateCurrentUser: vi.fn(),
    verifyEmail: vi.fn(),
    ...overrides,
  };
}

function createAdaptersWithAuth(auth: AuthAdapter) {
  return { ...createAppAdapters({ source: "mock" }), auth };
}

async function submitEmail(user: ReturnType<typeof setupUser>, email: string) {
  await user.type(screen.getByRole("textbox", { name: /correo electr[oó]nico/i }), email);
  await user.click(screen.getByRole("button", { name: /enviar enlace/i }));
}

describe("ForgotPasswordPage", () => {
  it("should confirm a known address without revealing account existence", async () => {
    const user = setupUser();
    const auth = createAuthSpy();
    renderWithProviders(<ForgotPasswordPage />, {
      adapters: createAdaptersWithAuth(auth),
      route: "/forgot-password",
    });

    await submitEmail(user, "conocido@example.edu");

    expect(auth.requestPasswordReset).toHaveBeenCalledWith({ email: "conocido@example.edu" });
    expect(await screen.findByText(/si existe una cuenta asociada al correo/i)).toBeInTheDocument();
    expect(
      screen.queryByRole("textbox", { name: /correo electr[oó]nico/i }),
    ).not.toBeInTheDocument();
  });

  it("should show the same confirmation for an unknown address", async () => {
    const user = setupUser();
    renderWithProviders(<ForgotPasswordPage />, {
      adapters: createAdaptersWithAuth(createAuthSpy()),
      route: "/forgot-password",
    });

    await submitEmail(user, "desconocido@example.edu");

    expect(await screen.findByText(/si existe una cuenta asociada al correo/i)).toBeInTheDocument();
  });

  it("should not repeat the submitted address in the confirmation", async () => {
    const user = setupUser();
    renderWithProviders(<ForgotPasswordPage />, {
      adapters: createAdaptersWithAuth(createAuthSpy()),
      route: "/forgot-password",
    });

    await submitEmail(user, "conocido@example.edu");

    await waitFor(() => {
      expect(document.body.innerHTML).not.toContain("conocido@example.edu");
    });
  });

  it("should explain throttling and keep the form available", async () => {
    const user = setupUser();
    const auth = createAuthSpy({
      requestPasswordReset: vi.fn().mockRejectedValue(new PasswordRecoveryError("throttled")),
    });
    renderWithProviders(<ForgotPasswordPage />, {
      adapters: createAdaptersWithAuth(auth),
      route: "/forgot-password",
    });

    await submitEmail(user, "persona@example.edu");

    expect(await screen.findByRole("alert")).toHaveTextContent(/demasiadas solicitudes/i);
    expect(screen.getByRole("textbox", { name: /correo electr[oó]nico/i })).toHaveValue(
      "persona@example.edu",
    );
  });

  it("should explain a service failure without backend wording", async () => {
    const user = setupUser();
    const auth = createAuthSpy({
      requestPasswordReset: vi.fn().mockRejectedValue(new PasswordRecoveryError("unknown")),
    });
    renderWithProviders(<ForgotPasswordPage />, {
      adapters: createAdaptersWithAuth(auth),
      route: "/forgot-password",
    });

    await submitEmail(user, "persona@example.edu");

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /no se pudo completar la solicitud/i,
    );
  });

  it("should let the visitor request a link again after the confirmation", async () => {
    const user = setupUser();
    renderWithProviders(<ForgotPasswordPage />, {
      adapters: createAdaptersWithAuth(createAuthSpy()),
      route: "/forgot-password",
    });

    await submitEmail(user, "persona@example.edu");
    await user.click(await screen.findByRole("button", { name: /solicitar otro enlace/i }));

    expect(
      await screen.findByRole("textbox", { name: /correo electr[oó]nico/i }),
    ).toBeInTheDocument();
  });
});
