import { act, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { createAppAdapters, type AuthAdapter } from "@/app/adapters";
import { renderHookWithProviders } from "@/test/render";

import { EmailVerificationError } from "../adapters/emailVerificationFailure";

import { useVerifyEmail } from "./useVerifyEmail";

function createAuthAdapter(overrides: Partial<AuthAdapter> = {}): AuthAdapter {
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

function createAdapters(auth: AuthAdapter) {
  return { ...createAppAdapters({ source: "mock" }), auth };
}

describe("useVerifyEmail", () => {
  it("should call verifyEmail with the provided token", async () => {
    const auth = createAuthAdapter();
    const { result } = renderHookWithProviders(() => useVerifyEmail(), {
      adapters: createAdapters(auth),
    });

    await act(async () => {
      await result.current.verify("verify-token");
    });

    expect(auth.verifyEmail).toHaveBeenCalledWith("verify-token");
    expect(result.current.failure).toBeNull();
    expect(result.current.isPending).toBe(false);
  });

  it("should expose a typed failure for an invalid link", async () => {
    const auth = createAuthAdapter({
      verifyEmail: vi.fn().mockRejectedValue(new EmailVerificationError("invalidLink")),
    });
    const { result } = renderHookWithProviders(() => useVerifyEmail(), {
      adapters: createAdapters(auth),
    });

    try {
      await act(async () => {
        await result.current.verify("invalid-token");
      });
    } catch {
      // expected rejection from mutateAsync
    }

    await waitFor(() => expect(result.current.failure).toBe("invalidLink"));
  });

  it("should expose throttling as its own failure", async () => {
    const auth = createAuthAdapter({
      verifyEmail: vi.fn().mockRejectedValue(new EmailVerificationError("throttled")),
    });
    const { result } = renderHookWithProviders(() => useVerifyEmail(), {
      adapters: createAdapters(auth),
    });

    try {
      await act(async () => {
        await result.current.verify("throttled-token");
      });
    } catch {
      // expected rejection from mutateAsync
    }

    await waitFor(() => expect(result.current.failure).toBe("throttled"));
  });

  it("should not report a connectivity problem as an invalid link", async () => {
    const auth = createAuthAdapter({
      verifyEmail: vi.fn().mockRejectedValue(new EmailVerificationError("unavailable")),
    });
    const { result } = renderHookWithProviders(() => useVerifyEmail(), {
      adapters: createAdapters(auth),
    });

    try {
      await act(async () => {
        await result.current.verify("offline-token");
      });
    } catch {
      // expected rejection from mutateAsync
    }

    await waitFor(() => expect(result.current.failure).toBe("unavailable"));
  });

  it("should complete verification without errors", async () => {
    const { result } = renderHookWithProviders(() => useVerifyEmail(), {
      adapters: createAdapters(createAuthAdapter()),
    });

    let verificationPromise: Promise<void> | undefined;
    act(() => {
      verificationPromise = result.current.verify("verify-token");
    });

    await act(async () => {
      await verificationPromise;
    });

    expect(result.current.isPending).toBe(false);
    expect(result.current.failure).toBeNull();
  });
});
