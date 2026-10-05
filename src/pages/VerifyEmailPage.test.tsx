import { screen, waitFor } from "@testing-library/react";
import { setupUser } from "@/test/user";
import { describe, expect, it, vi } from "vitest";

import { createAppAdapters, type AuthAdapter } from "@/app/adapters";
import { renderWithProviders } from "@/test/render";

import { EmailVerificationError } from "@/features/auth";

import { VerifyEmailPage } from "./VerifyEmailPage";

function createAuthSpy(overrides: Partial<AuthAdapter> = {}): AuthAdapter {
  return {
    changePassword: vi.fn(),
    loadCurrentUser: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
    refresh: vi.fn(),
    requestPasswordReset: vi.fn(),
    resetPassword: vi.fn(),
    updateCurrentUser: vi.fn(),
    verifyEmail: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function createAdaptersWithAuth(auth: AuthAdapter) {
  return { ...createAppAdapters({ source: "mock" }), auth };
}

describe("VerifyEmailPage", () => {
  it("should show an error when the token is missing", () => {
    renderWithProviders(<VerifyEmailPage />, {
      adapters: createAppAdapters({ source: "mock" }),
      route: "/verify-email",
    });

    expect(
      screen.getByText(
        /el enlace de activacion no incluye un token valido.*solicite un nuevo correo/i,
      ),
    ).toBeInTheDocument();
  });

  it("should remove the token from the address bar before the request finishes", async () => {
    const auth = createAuthSpy({
      verifyEmail: vi.fn(() => new Promise<void>(() => undefined)),
    });

    renderWithProviders(<VerifyEmailPage />, {
      adapters: createAdaptersWithAuth(auth),
      route: "/verify-email?token=valid-token",
    });

    await waitFor(() => expect(auth.verifyEmail).toHaveBeenCalledWith("valid-token"));
    expect(window.location.search).toBe("");
  });

  it("should keep the token out of the address bar when verification fails", async () => {
    const auth = createAuthSpy({
      verifyEmail: vi.fn().mockRejectedValue(new EmailVerificationError("invalidLink")),
    });

    renderWithProviders(<VerifyEmailPage />, {
      adapters: createAdaptersWithAuth(auth),
      route: "/verify-email?token=expired-token",
    });

    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    expect(window.location.search).toBe("");
  });

  it("should not confirm the account before the request succeeds", () => {
    const auth = createAuthSpy({
      verifyEmail: vi.fn(() => new Promise<void>(() => undefined)),
    });

    renderWithProviders(<VerifyEmailPage />, {
      adapters: createAdaptersWithAuth(auth),
      route: "/verify-email?token=valid-token",
    });

    expect(screen.getByRole("status")).toHaveTextContent("Verificando su correo electronico...");
    expect(screen.queryByText(/cuenta ha sido activada/i)).toBeNull();
  });

  it("should show an error when verification fails", async () => {
    const auth = createAuthSpy({
      verifyEmail: vi.fn().mockRejectedValue(new EmailVerificationError("invalidLink")),
    });

    renderWithProviders(<VerifyEmailPage />, {
      adapters: createAdaptersWithAuth(auth),
      route: "/verify-email?token=expired-token",
    });

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        /no fue posible activar su cuenta.*solicite un nuevo correo/i,
      );
    });
  });

  it("should not blame the link when the service throttles the request", async () => {
    const auth = createAuthSpy({
      verifyEmail: vi.fn().mockRejectedValue(new EmailVerificationError("throttled")),
    });

    renderWithProviders(<VerifyEmailPage />, {
      adapters: createAdaptersWithAuth(auth),
      route: "/verify-email?token=throttled-token",
    });

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/demasiados intentos/i);
    expect(alert).not.toHaveTextContent(/expirado|vencido|solicite un nuevo correo/i);
  });

  it("should not offer a retry countdown the contract does not provide", async () => {
    const auth = createAuthSpy({
      verifyEmail: vi.fn().mockRejectedValue(new EmailVerificationError("throttled")),
    });

    renderWithProviders(<VerifyEmailPage />, {
      adapters: createAdaptersWithAuth(auth),
      route: "/verify-email?token=throttled-token",
    });

    const alert = await screen.findByRole("alert");
    expect(alert).not.toHaveTextContent(/\d+\s*(segundos|minutos)\s*(de espera|para reintentar)/i);
  });

  it("should not report a connectivity problem as an invalid link", async () => {
    const auth = createAuthSpy({
      verifyEmail: vi.fn().mockRejectedValue(new EmailVerificationError("unavailable")),
    });

    renderWithProviders(<VerifyEmailPage />, {
      adapters: createAdaptersWithAuth(auth),
      route: "/verify-email?token=offline-token",
    });

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/no se pudo completar la solicitud/i);
    expect(alert).not.toHaveTextContent(/solicite un nuevo correo/i);
  });

  it("should let the user retry with the same link", async () => {
    const user = setupUser();
    const verifyEmail = vi
      .fn()
      .mockRejectedValueOnce(new EmailVerificationError("unavailable"))
      .mockResolvedValueOnce(undefined);
    const auth = createAuthSpy({ verifyEmail });

    renderWithProviders(<VerifyEmailPage />, {
      adapters: createAdaptersWithAuth(auth),
      route: "/verify-email?token=retry-token",
    });

    await user.click(await screen.findByRole("button", { name: /reintentar/i }));

    await waitFor(() => expect(verifyEmail).toHaveBeenCalledTimes(2));
    expect(verifyEmail).toHaveBeenNthCalledWith(2, "retry-token");
  });
});
