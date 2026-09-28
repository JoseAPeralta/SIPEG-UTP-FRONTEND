import { act, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createAppAdapters, type AuthAdapter } from "@/app/adapters";
import {
  clearPersistedQueryCache,
  createQueryClient,
  QUERY_CACHE_STORAGE_KEY,
  queryKeys,
} from "@/app/query";
import { useSessionStore } from "@/store/session";
import { useUnitPreferenceStore } from "@/store/unitPreference";
import { useWorkingContextStore } from "@/store/workingContext";
import { renderHookWithProviders } from "@/test/render";
import type { AuthenticatedUser, AuthTokens } from "@/types/domain";

import { AUTH_REFRESH_STORAGE_KEY, writeStoredRefreshSession } from "../model/authSessionStorage";

import { useAuthSessionBootstrap, useLogin, useLogout } from "./useAuthSession";

const currentUser: AuthenticatedUser = {
  career: null,
  email: "admin@example.edu",
  firstName: "Mariana",
  globalRole: "ADMIN",
  id: "user-1",
  identificationNumber: "8-123-456",
  lastName: "Rodriguez",
  unit: null,
};

const tokens: AuthTokens = {
  accessToken: "access-token",
  accessTokenExpiresAt: "2099-01-01T00:00:00.000Z",
  refreshToken: "refresh-token",
  refreshTokenExpiresAt: "2099-02-01T00:00:00.000Z",
  tokenType: "Bearer",
};

function createAuthAdapter(overrides: Partial<AuthAdapter> = {}): AuthAdapter {
  return {
    loadCurrentUser: vi.fn().mockResolvedValue(currentUser),
    login: vi.fn().mockResolvedValue(tokens),
    logout: vi.fn().mockResolvedValue(undefined),
    refresh: vi.fn().mockResolvedValue(tokens),
    verifyEmail: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function createAdapters(auth: AuthAdapter) {
  return { ...createAppAdapters({ source: "mock" }), auth };
}

describe("auth session hooks", () => {
  beforeEach(() => {
    useSessionStore.setState({ currentUser: null, status: "anonymous", tokens: null });
    useUnitPreferenceStore.getState().setSelectedUnitId("all");
    useWorkingContextStore.getState().clearWorkingContext();
    localStorage.clear();
    sessionStorage.clear();
  });

  it("should establish a session and clear data from another identity", async () => {
    const auth = createAuthAdapter();
    const queryClient = createQueryClient({ defaultOptions: { queries: { retry: false } } });
    queryClient.setQueryData(queryKeys.publicActivityCatalog, { stale: true });
    localStorage.setItem(QUERY_CACHE_STORAGE_KEY, "persisted");
    localStorage.setItem("sipeg-session", "legacy-user-profile");
    useUnitPreferenceStore.getState().setSelectedUnitId("fisc");
    useWorkingContextStore.getState().setWorkingContext({ id: "program-1", kind: "eventProgram" });
    const { result } = renderHookWithProviders(() => useLogin(), {
      adapters: createAdapters(auth),
      queryClient,
    });

    await act(async () => {
      await result.current.login({ email: "admin@example.edu", password: "secret" });
    });

    expect(useSessionStore.getState()).toMatchObject({
      currentUser,
      status: "authenticated",
      tokens,
    });
    expect(queryClient.getQueryData(queryKeys.publicActivityCatalog)).toBeUndefined();
    expect(localStorage.getItem(QUERY_CACHE_STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem("sipeg-session")).toBeNull();
    expect(useUnitPreferenceStore.getState().selectedUnitId).toBe("all");
    expect(useWorkingContextStore.getState().workingContext).toBeNull();
    expect(JSON.parse(String(sessionStorage.getItem(AUTH_REFRESH_STORAGE_KEY)))).toEqual({
      refreshToken: tokens.refreshToken,
      refreshTokenExpiresAt: tokens.refreshTokenExpiresAt,
    });
  });

  it("should restore a session with a rotated refresh token", async () => {
    const rotatedTokens = { ...tokens, refreshToken: "rotated-refresh-token" };
    const auth = createAuthAdapter({ refresh: vi.fn().mockResolvedValue(rotatedTokens) });
    writeStoredRefreshSession(tokens);
    useSessionStore.setState({ currentUser: null, status: "restoring", tokens: null });

    renderHookWithProviders(() => useAuthSessionBootstrap(), {
      adapters: createAdapters(auth),
    });

    await waitFor(() => expect(useSessionStore.getState().status).toBe("authenticated"));

    expect(auth.refresh).toHaveBeenCalledWith(tokens.refreshToken);
    expect(JSON.parse(String(sessionStorage.getItem(AUTH_REFRESH_STORAGE_KEY)))).toMatchObject({
      refreshToken: "rotated-refresh-token",
    });
  });

  it("should rotate tokens before the access token expires", async () => {
    vi.useFakeTimers();
    vi.setSystemTime("2026-09-26T12:00:00.000Z");
    const expiringTokens = {
      ...tokens,
      accessTokenExpiresAt: "2026-09-26T12:02:00.000Z",
    };
    const rotatedTokens = {
      ...tokens,
      accessToken: "rotated-access-token",
      accessTokenExpiresAt: "2026-09-26T12:20:00.000Z",
      refreshToken: "rotated-refresh-token",
    };
    const auth = createAuthAdapter({ refresh: vi.fn().mockResolvedValue(rotatedTokens) });
    useSessionStore.getState().setSession({ currentUser, tokens: expiringTokens });
    writeStoredRefreshSession(expiringTokens);

    renderHookWithProviders(() => useAuthSessionBootstrap(), {
      adapters: createAdapters(auth),
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(60 * 1000);
    });

    expect(auth.refresh).toHaveBeenCalledWith(expiringTokens.refreshToken);
    expect(useSessionStore.getState().tokens).toEqual(rotatedTokens);
  });

  it("should finish restoration anonymously without a stored refresh token", async () => {
    const auth = createAuthAdapter();
    localStorage.setItem("sipeg-session", "legacy-user-profile");
    useSessionStore.setState({ currentUser: null, status: "restoring", tokens: null });

    renderHookWithProviders(() => useAuthSessionBootstrap(), {
      adapters: createAdapters(auth),
    });

    await waitFor(() => expect(useSessionStore.getState().status).toBe("anonymous"));
    expect(auth.refresh).not.toHaveBeenCalled();
    expect(localStorage.getItem("sipeg-session")).toBeNull();
  });

  it("should clear invalid restoration state", async () => {
    const auth = createAuthAdapter({ refresh: vi.fn().mockRejectedValue(new Error("expired")) });
    writeStoredRefreshSession(tokens);
    useSessionStore.setState({ currentUser: null, status: "restoring", tokens: null });

    renderHookWithProviders(() => useAuthSessionBootstrap(), {
      adapters: createAdapters(auth),
    });

    await waitFor(() => expect(useSessionStore.getState().status).toBe("anonymous"));
    expect(sessionStorage.getItem(AUTH_REFRESH_STORAGE_KEY)).toBeNull();
  });

  it("should clear local state even when remote logout fails", async () => {
    const auth = createAuthAdapter({ logout: vi.fn().mockRejectedValue(new Error("offline")) });
    const queryClient = createQueryClient({ defaultOptions: { queries: { retry: false } } });
    useSessionStore.getState().setSession({ currentUser, tokens });
    writeStoredRefreshSession(tokens);
    queryClient.setQueryData(queryKeys.administrativeActivityCatalog(currentUser.id), {
      private: true,
    });
    const { result } = renderHookWithProviders(() => useLogout(), {
      adapters: createAdapters(auth),
      queryClient,
    });

    await act(async () => {
      await result.current.logout();
    });

    expect(auth.logout).toHaveBeenCalledWith(tokens.refreshToken);
    expect(useSessionStore.getState().status).toBe("anonymous");
    expect(sessionStorage.getItem(AUTH_REFRESH_STORAGE_KEY)).toBeNull();
    expect(
      queryClient.getQueryData(queryKeys.administrativeActivityCatalog(currentUser.id)),
    ).toBeUndefined();
  });

  it("should expose login errors without creating a session", async () => {
    const authError = new Error("credenciales invalidas");
    const auth = createAuthAdapter({ login: vi.fn().mockRejectedValue(authError) });
    const { result } = renderHookWithProviders(() => useLogin(), {
      adapters: createAdapters(auth),
    });

    await expect(
      act(async () => {
        await result.current.login({ email: "admin@example.edu", password: "incorrect" });
      }),
    ).rejects.toBe(authError);

    expect(useSessionStore.getState().status).toBe("anonymous");
  });

  afterEach(() => {
    vi.useRealTimers();
    clearPersistedQueryCache();
  });
});
