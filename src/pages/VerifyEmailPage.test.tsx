import { screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { createAppAdapters, type AuthAdapter } from "@/app/adapters";
import { renderWithProviders } from "@/test/render";

import { VerifyEmailPage } from "./VerifyEmailPage";

function createAuthSpy(overrides: Partial<AuthAdapter> = {}): AuthAdapter {
  return {
    loadCurrentUser: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
    refresh: vi.fn(),
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

    expect(screen.getByRole("alert")).toHaveTextContent(/enlace de activacion es invalido/i);
  });

  it("should call verifyEmail with the token from the url", async () => {
    const auth = createAuthSpy();

    renderWithProviders(<VerifyEmailPage />, {
      adapters: createAdaptersWithAuth(auth),
      route: "/verify-email?token=valid-token",
    });

    await waitFor(() => {
      expect(auth.verifyEmail).toHaveBeenCalledWith("valid-token");
    });
  });

  it("should show an error when verification fails", async () => {
    const auth = createAuthSpy({
      verifyEmail: vi.fn().mockRejectedValue(new Error("token expirado")),
    });

    renderWithProviders(<VerifyEmailPage />, {
      adapters: createAdaptersWithAuth(auth),
      route: "/verify-email?token=expired-token",
    });

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/no fue posible activar/i);
    });
  });
});
