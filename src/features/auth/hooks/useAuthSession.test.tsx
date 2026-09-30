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

import { AuthError } from "../adapters/authFailure";
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
    changePassword: vi.fn().mockResolvedValue(undefined),
    loadCurrentUser: vi.fn().mockResolvedValue(currentUser),
    login: vi.fn().mockResolvedValue(tokens),
    logout: vi.fn().mockResolvedValue(undefined),
    refresh: vi.fn().mockResolvedValue(tokens),
    requestPasswordReset: vi.fn().mockResolvedValue(undefined),
    resetPassword: vi.fn().mockResolvedValue(undefined),
    updateCurrentUser: vi.fn(),
    verifyEmail: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function createAdapters(auth: AuthAdapter) {
  return { ...createAppAdapters({ source: "mock" }), auth };
}

describe("auth session hooks", () => {
  beforeEach(() => {
    useSessionStore.setState({
      currentUser: null,
      sessionEndReason: null,
      status: "anonymous",
      tokens: null,
    });
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

  it("should wrap a login error without creating a session", async () => {
    const auth = createAuthAdapter({
      login: vi.fn().mockRejectedValue(new Error("credenciales invalidas")),
    });
    const { result } = renderHookWithProviders(() => useLogin(), {
      adapters: createAdapters(auth),
    });

    await expect(
      act(async () => {
        await result.current.login({ email: "admin@example.edu", password: "incorrect" });
      }),
    ).rejects.toMatchObject({ failure: "unknown" });

    expect(useSessionStore.getState().status).toBe("anonymous");
  });

  it("should expose a typed login failure without creating a session", async () => {
    const auth = createAuthAdapter({
      login: vi.fn().mockRejectedValue(new AuthError("rejected")),
    });
    const { result } = renderHookWithProviders(() => useLogin(), {
      adapters: createAdapters(auth),
    });

    await act(async () => {
      await expect(
        result.current.login({ email: "admin@example.edu", password: "incorrect" }),
      ).rejects.toMatchObject({ failure: "rejected" });
    });

    expect(useSessionStore.getState().status).toBe("anonymous");
  });

  it("should expose throttling as its own login failure", async () => {
    const auth = createAuthAdapter({
      login: vi.fn().mockRejectedValue(new AuthError("throttled")),
    });
    const { result } = renderHookWithProviders(() => useLogin(), {
      adapters: createAdapters(auth),
    });

    await act(async () => {
      await expect(
        result.current.login({ email: "admin@example.edu", password: "incorrect" }),
      ).rejects.toBeDefined();
    });

    await waitFor(() => expect(result.current.failure).toBe("throttled"));
  });

  it("should explain an expired stored session instead of a first visit", async () => {
    const auth = createAuthAdapter();
    writeStoredRefreshSession({ ...tokens, refreshTokenExpiresAt: "2020-01-01T00:00:00.000Z" });
    useSessionStore.setState({ currentUser: null, status: "restoring", tokens: null });

    renderHookWithProviders(() => useAuthSessionBootstrap(), {
      adapters: createAdapters(auth),
    });

    await waitFor(() => expect(useSessionStore.getState().status).toBe("anonymous"));
    expect(useSessionStore.getState().sessionEndReason).toBe("expired");
    expect(auth.refresh).not.toHaveBeenCalled();
  });

  it("should raise no notice on a first visit", async () => {
    const auth = createAuthAdapter();
    useSessionStore.setState({ currentUser: null, status: "restoring", tokens: null });

    renderHookWithProviders(() => useAuthSessionBootstrap(), {
      adapters: createAdapters(auth),
    });

    await waitFor(() => expect(useSessionStore.getState().status).toBe("anonymous"));
    expect(useSessionStore.getState().sessionEndReason).toBeNull();
  });

  it("should raise no notice for a malformed stored session", async () => {
    const auth = createAuthAdapter();
    sessionStorage.setItem(AUTH_REFRESH_STORAGE_KEY, "not-json");
    useSessionStore.setState({ currentUser: null, status: "restoring", tokens: null });

    renderHookWithProviders(() => useAuthSessionBootstrap(), {
      adapters: createAdapters(auth),
    });

    await waitFor(() => expect(useSessionStore.getState().status).toBe("anonymous"));
    expect(useSessionStore.getState().sessionEndReason).toBeNull();
  });

  it("should report a rejected refresh as an expired session", async () => {
    const auth = createAuthAdapter({
      refresh: vi.fn().mockRejectedValue(new AuthError("rejected")),
    });
    writeStoredRefreshSession(tokens);
    useSessionStore.setState({ currentUser: null, status: "restoring", tokens: null });

    renderHookWithProviders(() => useAuthSessionBootstrap(), {
      adapters: createAdapters(auth),
    });

    await waitFor(() => expect(useSessionStore.getState().sessionEndReason).toBe("expired"));
    expect(useSessionStore.getState().currentUser).toBeNull();
    expect(sessionStorage.getItem(AUTH_REFRESH_STORAGE_KEY)).toBeNull();
  });

  it("should report a throttled refresh as a temporary limit", async () => {
    const auth = createAuthAdapter({
      refresh: vi.fn().mockRejectedValue(new AuthError("throttled")),
    });
    writeStoredRefreshSession(tokens);
    useSessionStore.setState({ currentUser: null, status: "restoring", tokens: null });

    renderHookWithProviders(() => useAuthSessionBootstrap(), {
      adapters: createAdapters(auth),
    });

    await waitFor(() => expect(useSessionStore.getState().sessionEndReason).toBe("throttled"));
  });

  it("should not report a connectivity problem as an expired session", async () => {
    const auth = createAuthAdapter({
      refresh: vi.fn().mockRejectedValue(new AuthError("unavailable")),
    });
    writeStoredRefreshSession(tokens);
    useSessionStore.setState({ currentUser: null, status: "restoring", tokens: null });

    renderHookWithProviders(() => useAuthSessionBootstrap(), {
      adapters: createAdapters(auth),
    });

    await waitFor(() => expect(useSessionStore.getState().sessionEndReason).toBe("unavailable"));
  });

  it("should keep a new session when a slow restoration fails", async () => {
    let rejectRefresh: (error: unknown) => void = () => undefined;
    const auth = createAuthAdapter({
      refresh: vi.fn(
        () =>
          new Promise<AuthTokens>((_resolve, reject) => {
            rejectRefresh = reject;
          }),
      ),
    });
    writeStoredRefreshSession(tokens);
    useSessionStore.setState({ currentUser: null, status: "restoring", tokens: null });

    renderHookWithProviders(() => useAuthSessionBootstrap(), {
      adapters: createAdapters(auth),
    });

    await waitFor(() => expect(auth.refresh).toHaveBeenCalled());

    await act(() => {
      useSessionStore.getState().setSession({ currentUser, tokens });
      rejectRefresh(new AuthError("rejected"));
      return Promise.resolve();
    });

    expect(useSessionStore.getState().status).toBe("authenticated");
    expect(useSessionStore.getState().currentUser).toEqual(currentUser);
    expect(useSessionStore.getState().sessionEndReason).toBeNull();
  });

  it("should clear the notice after a successful login", async () => {
    const auth = createAuthAdapter();
    useSessionStore.getState().endSession("expired");
    const { result } = renderHookWithProviders(() => useLogin(), {
      adapters: createAdapters(auth),
    });

    await act(async () => {
      await result.current.login({ email: "admin@example.edu", password: "secret" });
    });

    expect(useSessionStore.getState().sessionEndReason).toBeNull();
  });

  afterEach(() => {
    vi.useRealTimers();
    clearPersistedQueryCache();
  });
});
