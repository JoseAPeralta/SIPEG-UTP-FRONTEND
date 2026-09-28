import { act, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { createAppAdapters, type AuthAdapter } from "@/app/adapters";
import { renderHookWithProviders } from "@/test/render";

import { useVerifyEmail } from "./useVerifyEmail";

function createAuthAdapter(overrides: Partial<AuthAdapter> = {}): AuthAdapter {
  return {
    loadCurrentUser: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
    refresh: vi.fn(),
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
    expect(result.current.error).toBeNull();
    expect(result.current.isPending).toBe(false);
  });

  it("should expose verification errors", async () => {
    const error = new Error("token invalido");
    const auth = createAuthAdapter({
      verifyEmail: vi.fn().mockRejectedValue(error),
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

    await waitFor(() => expect(result.current.error).toBe(error));
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
    expect(result.current.error).toBeNull();
  });
});
