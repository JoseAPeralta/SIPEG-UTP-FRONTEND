import { act, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { createAppAdapters, type AuthAdapter } from "@/app/adapters";
import { renderHookWithProviders } from "@/test/render";

import { PasswordRecoveryError } from "../adapters/passwordRecoveryFailure";

import { useRequestPasswordReset, useResetPassword } from "./usePasswordRecovery";

function createAuthAdapter(overrides: Partial<AuthAdapter> = {}): AuthAdapter {
  return {
    changePassword: vi.fn().mockResolvedValue(undefined),
    loadCurrentUser: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
    refresh: vi.fn(),
    requestPasswordReset: vi.fn().mockResolvedValue(undefined),
    resetPassword: vi.fn().mockResolvedValue(undefined),
    updateCurrentUser: vi.fn(),
    verifyEmail: vi.fn(),
    ...overrides,
  };
}

function createAdapters(auth: AuthAdapter) {
  return { ...createAppAdapters({ source: "mock" }), auth };
}

describe("useRequestPasswordReset", () => {
  it("should send the request payload to the adapter", async () => {
    const auth = createAuthAdapter();
    const { result } = renderHookWithProviders(() => useRequestPasswordReset(), {
      adapters: createAdapters(auth),
    });

    await act(async () => {
      await result.current.requestPasswordReset({ email: "persona@example.edu" });
    });

    expect(auth.requestPasswordReset).toHaveBeenCalledWith({ email: "persona@example.edu" });
    expect(result.current.failure).toBeNull();
    expect(result.current.isPending).toBe(false);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it("should report a pending state while the request runs", async () => {
    const auth = createAuthAdapter({
      requestPasswordReset: vi.fn(() => new Promise<void>(() => undefined)),
    });
    const { result } = renderHookWithProviders(() => useRequestPasswordReset(), {
      adapters: createAdapters(auth),
    });

    act(() => {
      void result.current.requestPasswordReset({ email: "persona@example.edu" });
    });

    await waitFor(() => expect(result.current.isPending).toBe(true));
    expect(result.current.isSuccess).toBe(false);
  });

  it("should wrap a foreign error as an unknown failure", async () => {
    const auth = createAuthAdapter({
      requestPasswordReset: vi.fn().mockRejectedValue(new Error("boom")),
    });
    const { result } = renderHookWithProviders(() => useRequestPasswordReset(), {
      adapters: createAdapters(auth),
    });

    try {
      await act(async () => {
        await result.current.requestPasswordReset({ email: "persona@example.edu" });
      });
    } catch {
      // expected rejection from mutateAsync
    }

    await waitFor(() => expect(result.current.failure).toBe("unknown"));
    expect(result.current.isSuccess).toBe(false);
  });

  it("should preserve a failure already classified by the adapter boundary", async () => {
    const auth = createAuthAdapter({
      requestPasswordReset: vi.fn().mockRejectedValue(new PasswordRecoveryError("throttled")),
    });
    const { result } = renderHookWithProviders(() => useRequestPasswordReset(), {
      adapters: createAdapters(auth),
    });

    try {
      await act(async () => {
        await result.current.requestPasswordReset({ email: "persona@example.edu" });
      });
    } catch {
      // expected rejection from mutateAsync
    }

    await waitFor(() => expect(result.current.failure).toBe("throttled"));
  });
});

describe("useResetPassword", () => {
  it("should send the reset payload to the adapter", async () => {
    const auth = createAuthAdapter();
    const { result } = renderHookWithProviders(() => useResetPassword(), {
      adapters: createAdapters(auth),
    });

    await act(async () => {
      await result.current.resetPassword({ newPassword: "Nueva clave 2026", token: "reset-token" });
    });

    expect(auth.resetPassword).toHaveBeenCalledWith({
      newPassword: "Nueva clave 2026",
      token: "reset-token",
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it("should expose reset errors as password recovery failures", async () => {
    const auth = createAuthAdapter({
      resetPassword: vi.fn().mockRejectedValue(new Error("token invalido")),
    });
    const { result } = renderHookWithProviders(() => useResetPassword(), {
      adapters: createAdapters(auth),
    });

    try {
      await act(async () => {
        await result.current.resetPassword({ newPassword: "Nueva clave 2026", token: "expired" });
      });
    } catch {
      // expected rejection from mutateAsync
    }

    await waitFor(() => expect(result.current.failure).toBe("unknown"));
  });
});
