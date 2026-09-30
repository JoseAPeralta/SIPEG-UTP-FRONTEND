import { act, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createAppAdapters, type AuthAdapter } from "@/app/adapters";
import { createQueryClient } from "@/app/query";
import { useSessionStore } from "@/store/session";
import { useUnitPreferenceStore } from "@/store/unitPreference";
import { useWorkingContextStore } from "@/store/workingContext";
import { createAuthenticatedUser, createAuthTokens } from "@/test/factories";
import { renderHookWithProviders } from "@/test/render";
import type { AuthenticatedUser } from "@/types/domain";

import { ProfileUpdateError } from "../adapters/profileUpdateFailure";

import { useProfile } from "./useProfile";

function createAuthAdapter(overrides: Partial<AuthAdapter> = {}): AuthAdapter {
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

function createAdapters(auth: AuthAdapter) {
  return { ...createAppAdapters({ source: "mock" }), auth };
}

const request = { firstName: "Mariana Paula" };

describe("useProfile", () => {
  beforeEach(() => {
    useSessionStore.getState().clearSession();
    useUnitPreferenceStore.getState().setSelectedUnitId("all");
    useWorkingContextStore.getState().clearWorkingContext();
    localStorage.clear();
    sessionStorage.clear();
  });

  it("should send the contracted patch with the current access token", async () => {
    const tokens = createAuthTokens();
    const updatedUser = createAuthenticatedUser({ firstName: "Mariana Paula" });
    const auth = createAuthAdapter({ updateCurrentUser: vi.fn().mockResolvedValue(updatedUser) });
    useSessionStore.getState().setSession({ currentUser: createAuthenticatedUser(), tokens });

    const { result } = renderHookWithProviders(() => useProfile(), {
      adapters: createAdapters(auth),
    });

    await act(async () => {
      await result.current.updateProfile(request);
    });

    expect(auth.updateCurrentUser).toHaveBeenCalledWith(tokens.accessToken, request);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.failure).toBeNull();
  });

  it("should read the access token at submission time instead of the first render", async () => {
    const auth = createAuthAdapter();
    useSessionStore.getState().setSession({
      currentUser: createAuthenticatedUser(),
      tokens: createAuthTokens({ accessToken: "initial-access" }),
    });

    const { result } = renderHookWithProviders(() => useProfile(), {
      adapters: createAdapters(auth),
    });

    act(() => {
      useSessionStore.getState().setSession({
        currentUser: createAuthenticatedUser(),
        tokens: createAuthTokens({ accessToken: "rotated-access" }),
      });
    });

    await act(async () => {
      await result.current.updateProfile(request);
    });

    expect(auth.updateCurrentUser).toHaveBeenCalledWith("rotated-access", request);
  });

  it("should reflect the returned profile in the session store", async () => {
    const updatedUser = createAuthenticatedUser({
      career: { code: "CIVIL", id: "civil", name: "Ingenieria Civil" },
      firstName: "Mariana Paula",
      unit: { code: "FIC", id: "fic", name: "Facultad de Ingenieria Civil" },
    });
    const auth = createAuthAdapter({ updateCurrentUser: vi.fn().mockResolvedValue(updatedUser) });
    useSessionStore.getState().setSession({
      currentUser: createAuthenticatedUser(),
      tokens: createAuthTokens(),
    });

    const { result } = renderHookWithProviders(() => useProfile(), {
      adapters: createAdapters(auth),
    });

    await act(async () => {
      await result.current.updateProfile(request);
    });

    await waitFor(() => expect(useSessionStore.getState().currentUser).toEqual(updatedUser));
  });

  it("should preserve credentials, caches and working context after a successful update", async () => {
    const tokens = createAuthTokens();
    const auth = createAuthAdapter();
    useSessionStore.getState().setSession({ currentUser: createAuthenticatedUser(), tokens });
    useWorkingContextStore
      .getState()
      .setWorkingContext({ id: "program-innovation-week", kind: "eventProgram" });
    useUnitPreferenceStore.getState().setSelectedUnitId("fisc");
    sessionStorage.setItem("sipeg-auth-refresh", JSON.stringify(tokens));

    const queryClient = createQueryClient({ defaultOptions: { queries: { retry: false } } });
    queryClient.setQueryData(["catalog", "public"], { activities: [] });

    const { result } = renderHookWithProviders(() => useProfile(), {
      adapters: createAdapters(auth),
      queryClient,
    });

    await act(async () => {
      await result.current.updateProfile(request);
    });

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

  it("should discard the returned profile when the session was closed while in flight", async () => {
    let resolveUpdate: (user: AuthenticatedUser) => void = () => undefined;
    const auth = createAuthAdapter({
      updateCurrentUser: vi.fn(
        () =>
          new Promise<AuthenticatedUser>((resolve) => {
            resolveUpdate = resolve;
          }),
      ),
    });
    useSessionStore.getState().setSession({
      currentUser: createAuthenticatedUser(),
      tokens: createAuthTokens(),
    });

    const { result } = renderHookWithProviders(() => useProfile(), {
      adapters: createAdapters(auth),
    });

    let submitted: Promise<unknown> = Promise.resolve();
    act(() => {
      submitted = result.current.updateProfile(request);
    });

    await waitFor(() => expect(result.current.isPending).toBe(true));

    act(() => {
      useSessionStore.getState().clearSession();
      resolveUpdate(createAuthenticatedUser({ firstName: "Mariana Paula" }));
    });

    await act(async () => {
      await submitted;
    });

    expect(useSessionStore.getState().currentUser).toBeNull();
    expect(useSessionStore.getState().status).toBe("anonymous");
  });

  it("should report a pending state while the update runs", async () => {
    const auth = createAuthAdapter({
      updateCurrentUser: vi.fn(() => new Promise<never>(() => undefined)),
    });
    useSessionStore.getState().setSession({
      currentUser: createAuthenticatedUser(),
      tokens: createAuthTokens(),
    });

    const { result } = renderHookWithProviders(() => useProfile(), {
      adapters: createAdapters(auth),
    });

    act(() => {
      void result.current.updateProfile(request);
    });

    await waitFor(() => expect(result.current.isPending).toBe(true));
    expect(result.current.isSuccess).toBe(false);
  });

  it("should fail with an unauthenticated failure when there is no session", async () => {
    const auth = createAuthAdapter();

    const { result } = renderHookWithProviders(() => useProfile(), {
      adapters: createAdapters(auth),
    });

    try {
      await act(async () => {
        await result.current.updateProfile(request);
      });
    } catch {
      // expected rejection from mutateAsync
    }

    await waitFor(() => expect(result.current.failure).toBe("unauthenticated"));
    expect(auth.updateCurrentUser).not.toHaveBeenCalled();
  });

  it.each(["invalid", "conflict", "notFound"] as const)(
    "should surface the %s failure returned by the adapter",
    async (thrown) => {
      const auth = createAuthAdapter({
        updateCurrentUser: vi.fn().mockRejectedValue(new ProfileUpdateError(thrown)),
      });
      useSessionStore.getState().setSession({
        currentUser: createAuthenticatedUser(),
        tokens: createAuthTokens(),
      });

      const { result } = renderHookWithProviders(() => useProfile(), {
        adapters: createAdapters(auth),
      });

      try {
        await act(async () => {
          await result.current.updateProfile(request);
        });
      } catch {
        // expected rejection from mutateAsync
      }

      await waitFor(() => expect(result.current.failure).toBe(thrown));
      expect(useSessionStore.getState().currentUser?.firstName).toBe("Mariana");
    },
  );

  it("should wrap a foreign error as an unknown failure", async () => {
    const auth = createAuthAdapter({
      updateCurrentUser: vi.fn().mockRejectedValue(new Error("boom")),
    });
    useSessionStore.getState().setSession({
      currentUser: createAuthenticatedUser(),
      tokens: createAuthTokens(),
    });

    const { result } = renderHookWithProviders(() => useProfile(), {
      adapters: createAdapters(auth),
    });

    try {
      await act(async () => {
        await result.current.updateProfile(request);
      });
    } catch {
      // expected rejection from mutateAsync
    }

    await waitFor(() => expect(result.current.failure).toBe("unknown"));
  });

  it("should end the session when the server rejects the access token", async () => {
    const auth = createAuthAdapter({
      updateCurrentUser: vi.fn().mockRejectedValue(new ProfileUpdateError("unauthenticated")),
    });
    useSessionStore.getState().setSession({
      currentUser: createAuthenticatedUser(),
      tokens: createAuthTokens(),
    });

    const { result } = renderHookWithProviders(() => useProfile(), {
      adapters: createAdapters(auth),
    });

    try {
      await act(async () => {
        await result.current.updateProfile(request);
      });
    } catch {
      // expected rejection from mutateAsync
    }

    await waitFor(() => expect(result.current.failure).toBe("unauthenticated"));
    expect(useSessionStore.getState().status).toBe("anonymous");
    expect(useSessionStore.getState().sessionEndReason).toBe("expired");
  });

  it("should keep the session when the update fails for another reason", async () => {
    const auth = createAuthAdapter({
      updateCurrentUser: vi.fn().mockRejectedValue(new ProfileUpdateError("invalid")),
    });
    useSessionStore.getState().setSession({
      currentUser: createAuthenticatedUser(),
      tokens: createAuthTokens(),
    });

    const { result } = renderHookWithProviders(() => useProfile(), {
      adapters: createAdapters(auth),
    });

    try {
      await act(async () => {
        await result.current.updateProfile(request);
      });
    } catch {
      // expected rejection from mutateAsync
    }

    await waitFor(() => expect(result.current.failure).toBe("invalid"));
    expect(useSessionStore.getState().status).toBe("authenticated");
    expect(useSessionStore.getState().sessionEndReason).toBeNull();
  });
});
