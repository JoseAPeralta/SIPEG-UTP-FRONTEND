import { act, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createAppAdapters, type AuthAdapter } from "@/app/adapters";
import { createQueryClient } from "@/app/query";
import { useSessionStore } from "@/store/session";
import { useUnitPreferenceStore } from "@/store/unitPreference";
import { useWorkingContextStore } from "@/store/workingContext";
import { createAuthenticatedUser, createAuthTokens } from "@/test/factories";
import { renderHookWithProviders } from "@/test/render";

import { PasswordChangeError } from "../adapters/passwordChangeFailure";

import { useChangePassword } from "./useChangePassword";

function createAuthAdapter(overrides: Partial<AuthAdapter> = {}): AuthAdapter {
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

function createAdapters(auth: AuthAdapter) {
  return { ...createAppAdapters({ source: "mock" }), auth };
}

const request = { currentPassword: "sipeg-demo", newPassword: "Nueva clave 2026" };

describe("useChangePassword", () => {
  beforeEach(() => {
    useSessionStore.getState().clearSession();
    useUnitPreferenceStore.getState().setSelectedUnitId("all");
    useWorkingContextStore.getState().clearWorkingContext();
    localStorage.clear();
    sessionStorage.clear();
  });

  it("should compose the contracted payload with the current session tokens", async () => {
    const tokens = createAuthTokens();
    const auth = createAuthAdapter();
    useSessionStore.getState().setSession({
      currentUser: createAuthenticatedUser(),
      tokens,
    });

    const { result } = renderHookWithProviders(() => useChangePassword(), {
      adapters: createAdapters(auth),
    });

    await act(async () => {
      await result.current.changePassword(request);
    });

    expect(auth.changePassword).toHaveBeenCalledWith(tokens.accessToken, {
      ...request,
      refreshToken: tokens.refreshToken,
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.failure).toBeNull();
  });

  it("should read the tokens at submission time instead of the first render", async () => {
    const initialTokens = createAuthTokens({ accessToken: "initial-access" });
    const rotatedTokens = createAuthTokens({ accessToken: "rotated-access" });
    const auth = createAuthAdapter();
    useSessionStore.getState().setSession({
      currentUser: createAuthenticatedUser(),
      tokens: initialTokens,
    });

    const { result } = renderHookWithProviders(() => useChangePassword(), {
      adapters: createAdapters(auth),
    });

    act(() => {
      useSessionStore.getState().setSession({
        currentUser: createAuthenticatedUser(),
        tokens: rotatedTokens,
      });
    });

    await act(async () => {
      await result.current.changePassword(request);
    });

    expect(auth.changePassword).toHaveBeenCalledWith(
      rotatedTokens.accessToken,
      expect.objectContaining({ refreshToken: rotatedTokens.refreshToken }),
    );
  });

  it("should keep the current session and its caches after a successful change", async () => {
    const tokens = createAuthTokens();
    const currentUser = createAuthenticatedUser();
    const auth = createAuthAdapter();
    useSessionStore.getState().setSession({ currentUser, tokens });
    useWorkingContextStore
      .getState()
      .setWorkingContext({ id: "program-innovation-week", kind: "eventProgram" });
    useUnitPreferenceStore.getState().setSelectedUnitId("fisc");
    sessionStorage.setItem("sipeg-auth-refresh", JSON.stringify(tokens));

    const queryClient = createQueryClient({ defaultOptions: { queries: { retry: false } } });
    queryClient.setQueryData(["catalog", "public"], { activities: [] });

    const { result } = renderHookWithProviders(() => useChangePassword(), {
      adapters: createAdapters(auth),
      queryClient,
    });

    await act(async () => {
      await result.current.changePassword(request);
    });

    expect(useSessionStore.getState().currentUser).toEqual(currentUser);
    expect(useSessionStore.getState().tokens).toEqual(tokens);
    expect(useSessionStore.getState().status).toBe("authenticated");
    expect(useWorkingContextStore.getState().workingContext).toEqual({
      id: "program-innovation-week",
      kind: "eventProgram",
    });
    expect(useUnitPreferenceStore.getState().selectedUnitId).toBe("fisc");
    expect(queryClient.getQueryData(["catalog", "public"])).toEqual({ activities: [] });
    expect(sessionStorage.getItem("sipeg-auth-refresh")).not.toBeNull();
  });

  it("should report a pending state while the change runs", async () => {
    const auth = createAuthAdapter({
      changePassword: vi.fn(() => new Promise<void>(() => undefined)),
    });
    useSessionStore.getState().setSession({
      currentUser: createAuthenticatedUser(),
      tokens: createAuthTokens(),
    });

    const { result } = renderHookWithProviders(() => useChangePassword(), {
      adapters: createAdapters(auth),
    });

    act(() => {
      void result.current.changePassword(request);
    });

    await waitFor(() => expect(result.current.isPending).toBe(true));
    expect(result.current.isSuccess).toBe(false);
  });

  it("should fail with an unauthenticated failure when there is no session", async () => {
    const auth = createAuthAdapter();

    const { result } = renderHookWithProviders(() => useChangePassword(), {
      adapters: createAdapters(auth),
    });

    try {
      await act(async () => {
        await result.current.changePassword(request);
      });
    } catch {
      // expected rejection from mutateAsync
    }

    await waitFor(() => expect(result.current.failure).toBe("unauthenticated"));
    expect(auth.changePassword).not.toHaveBeenCalled();
  });

  it("should translate a wrong current password into an invalid failure", async () => {
    const auth = createAuthAdapter({
      changePassword: vi.fn().mockRejectedValue(new PasswordChangeError("invalid")),
    });
    useSessionStore.getState().setSession({
      currentUser: createAuthenticatedUser(),
      tokens: createAuthTokens(),
    });

    const { result } = renderHookWithProviders(() => useChangePassword(), {
      adapters: createAdapters(auth),
    });

    try {
      await act(async () => {
        await result.current.changePassword(request);
      });
    } catch {
      // expected rejection from mutateAsync
    }

    await waitFor(() => expect(result.current.failure).toBe("invalid"));
    expect(result.current.isSuccess).toBe(false);
  });

  it("should wrap a foreign error as an unknown failure", async () => {
    const auth = createAuthAdapter({
      changePassword: vi.fn().mockRejectedValue(new Error("boom")),
    });
    useSessionStore.getState().setSession({
      currentUser: createAuthenticatedUser(),
      tokens: createAuthTokens(),
    });

    const { result } = renderHookWithProviders(() => useChangePassword(), {
      adapters: createAdapters(auth),
    });

    try {
      await act(async () => {
        await result.current.changePassword(request);
      });
    } catch {
      // expected rejection from mutateAsync
    }

    await waitFor(() => expect(result.current.failure).toBe("unknown"));
  });

  it("should end the session when the server rejects the access token", async () => {
    const auth = createAuthAdapter({
      changePassword: vi.fn().mockRejectedValue(new PasswordChangeError("unauthenticated")),
    });
    useSessionStore.getState().setSession({
      currentUser: createAuthenticatedUser(),
      tokens: createAuthTokens(),
    });

    const { result } = renderHookWithProviders(() => useChangePassword(), {
      adapters: createAdapters(auth),
    });

    try {
      await act(async () => {
        await result.current.changePassword(request);
      });
    } catch {
      // expected rejection from mutateAsync
    }

    await waitFor(() => expect(result.current.failure).toBe("unauthenticated"));
    expect(useSessionStore.getState().status).toBe("anonymous");
    expect(useSessionStore.getState().sessionEndReason).toBe("expired");
  });

  it("should keep the session when a wrong current password is reported", async () => {
    const auth = createAuthAdapter({
      changePassword: vi.fn().mockRejectedValue(new PasswordChangeError("invalid")),
    });
    useSessionStore.getState().setSession({
      currentUser: createAuthenticatedUser(),
      tokens: createAuthTokens(),
    });

    const { result } = renderHookWithProviders(() => useChangePassword(), {
      adapters: createAdapters(auth),
    });

    try {
      await act(async () => {
        await result.current.changePassword(request);
      });
    } catch {
      // expected rejection from mutateAsync
    }

    await waitFor(() => expect(result.current.failure).toBe("invalid"));
    expect(useSessionStore.getState().status).toBe("authenticated");
    expect(useSessionStore.getState().sessionEndReason).toBeNull();
  });
});
