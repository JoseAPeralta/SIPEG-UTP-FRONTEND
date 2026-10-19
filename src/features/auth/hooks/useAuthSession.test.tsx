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
import { createAlertsPage } from "@/test/factories";
import { renderHookWithProviders } from "@/test/render";
import type { AuthenticatedUser, AuthTokens } from "@/types/domain";

import { AuthError } from "../adapters/authFailure";

import {
  useAuthSessionBootstrap,
  useLogin,
  useLogout,
  useProactiveTokenRenewal,
} from "./useAuthSession";

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
    // La cookie HttpOnly la guarda el navegador; el codigo no escribe nada.
    expect(sessionStorage.length).toBe(0);
  });

  it("should restore the session from the cookie on load", async () => {
    // No hay nada que leer del almacenamiento: la cookie la envio el navegador y
    // el backend responde con la sesion. Esto es lo que hace que una pestana
    // nueva quede autenticada sin volver a iniciar sesion.
    const auth = createAuthAdapter();
    useSessionStore.setState({ currentUser: null, status: "restoring", tokens: null });

    renderHookWithProviders(() => useAuthSessionBootstrap(), {
      adapters: createAdapters(auth),
    });

    await waitFor(() => expect(useSessionStore.getState().status).toBe("authenticated"));

    expect(auth.refresh).toHaveBeenCalledWith();
    expect(sessionStorage.length).toBe(0);
  });

  it("should clear identity and private cache when another tab logs out", async () => {
    const channel = {
      onmessage: null as ((event: MessageEvent) => void) | null,
      postMessage: vi.fn(),
      close: vi.fn(),
    };
    vi.stubGlobal(
      "BroadcastChannel",
      vi.fn(function () {
        return channel;
      }),
    );
    const auth = createAuthAdapter();
    const queryClient = createQueryClient();
    const { result } = renderHookWithProviders(() => useLogin(), {
      adapters: createAdapters(auth),
      queryClient,
    });
    await act(async () => {
      await result.current.login({ email: currentUser.email, password: "secret" });
    });
    queryClient.setQueryData(["private", currentUser.id], { secret: true });
    queryClient.setQueryData(
      queryKeys.alertsPage(currentUser.id, { isRead: false }, 1),
      createAlertsPage({ total: 2 }),
    );
    act(() => {
      channel.onmessage?.(new MessageEvent("message", { data: { kind: "session-ended" } }));
    });
    expect(useSessionStore.getState()).toMatchObject({
      status: "anonymous",
      currentUser: null,
      tokens: null,
    });
    expect(queryClient.getQueryData(["private", currentUser.id])).toBeUndefined();
    expect(queryClient.getQueryCache().findAll({ queryKey: ["alerts"] })).toHaveLength(0);
    expect(auth.logout).not.toHaveBeenCalled();
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
    };
    const auth = createAuthAdapter({
      login: vi.fn().mockResolvedValue(expiringTokens),
      refresh: vi.fn().mockResolvedValue(rotatedTokens),
    });

    // Se entra por el login porque el coordinador es quien calcula cuando
    // renovar, y solo conoce la sesion que el login le entrego. Escribir el store
    // a mano dejaria al coordinador sin saber que hay algo que renovar.
    const { result } = renderHookWithProviders(() => useLogin(), {
      adapters: createAdapters(auth),
    });

    await act(async () => {
      await result.current.login({ email: "admin@example.edu", password: "secret" });
    });

    renderHookWithProviders(() => useProactiveTokenRenewal(), {
      adapters: createAdapters(auth),
    });

    // El margen es de 60 s, asi que a las 12:01:30 todavia no toca: se comprueba
    // que espera y no renueva antes de tiempo.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30 * 1000);
    });
    expect(auth.refresh).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(30 * 1000);
    });

    expect(auth.refresh).toHaveBeenCalledWith();
    expect(useSessionStore.getState().tokens?.accessToken).toBe(rotatedTokens.accessToken);
  });

  it("retries transient renewal failures without losing the session", async () => {
    vi.useFakeTimers();
    vi.setSystemTime("2026-09-26T12:00:00.000Z");
    const auth = createAuthAdapter({
      login: vi
        .fn()
        .mockResolvedValue({ ...tokens, accessTokenExpiresAt: "2026-09-26T12:01:01.000Z" }),
      refresh: vi.fn().mockRejectedValueOnce(new AuthError("throttled")).mockResolvedValue(tokens),
    });
    const adapters = createAdapters(auth);
    const { result } = renderHookWithProviders(
      () => {
        useProactiveTokenRenewal();
        return useLogin();
      },
      { adapters },
    );
    await act(async () => {
      await result.current.login({ email: currentUser.email, password: "secret" });
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000);
    });
    expect(auth.refresh).toHaveBeenCalledTimes(1);
    expect(useSessionStore.getState().status).toBe("authenticated");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000);
    });
    expect(auth.refresh).toHaveBeenCalledTimes(2);
    expect(useSessionStore.getState().tokens).toEqual(tokens);
  });

  it("should finish restoration anonymously when there is no session", async () => {
    // Sin cookie, `refresh` responde 401. Es el caso normal de un visitante
    // anonimo: se llega a la pantalla de login sin mostrar ningun error.
    const auth = createAuthAdapter({
      refresh: vi.fn().mockRejectedValue(Object.assign(new Error("unauthorized"), { status: 401 })),
    });
    localStorage.setItem("sipeg-session", "legacy-user-profile");
    useSessionStore.setState({ currentUser: null, status: "restoring", tokens: null });

    renderHookWithProviders(() => useAuthSessionBootstrap(), {
      adapters: createAdapters(auth),
    });

    await waitFor(() => expect(useSessionStore.getState().status).toBe("anonymous"));
    expect(auth.refresh).toHaveBeenCalledWith();
    expect(localStorage.getItem("sipeg-session")).toBeNull();
    expect(sessionStorage.length).toBe(0);
  });

  it("should keep the session when the bootstrap refresh fails transiently", async () => {
    // Un 429 o una caida de red no terminan la sesion: el usuario volveria a
    // tenerla al minuto sin haber hecho nada.
    const auth = createAuthAdapter({
      refresh: vi.fn().mockRejectedValue(new AuthError("throttled")),
    });
    useSessionStore.setState({ currentUser: null, status: "restoring", tokens: null });

    renderHookWithProviders(() => useAuthSessionBootstrap(), {
      adapters: createAdapters(auth),
    });

    // Un limite de cuota se avisa, pero no se revoca nada en el servidor: el
    // usuario conserva su sesion.
    await waitFor(() => expect(useSessionStore.getState().sessionEndReason).toBe("throttled"));
    expect(auth.logout).not.toHaveBeenCalled();
  });

  it("should expose a failed remote logout so the user can retry", async () => {
    const auth = createAuthAdapter({ logout: vi.fn().mockRejectedValue(new Error("offline")) });
    const queryClient = createQueryClient({ defaultOptions: { queries: { retry: false } } });
    useSessionStore.getState().setSession({ currentUser, tokens });
    queryClient.setQueryData(queryKeys.administrativeActivityCatalog(currentUser.id), {
      private: true,
    });
    const { result } = renderHookWithProviders(() => useLogout(), {
      adapters: createAdapters(auth),
      queryClient,
    });

    await act(async () => {
      await expect(result.current.logout()).rejects.toBeDefined();
    });

    expect(auth.logout).toHaveBeenCalled();
    expect(useSessionStore.getState().status).toBe("authenticated");
    expect(sessionStorage.length).toBe(0);
    expect(
      queryClient.getQueryData(queryKeys.administrativeActivityCatalog(currentUser.id)),
    ).toEqual({ private: true });
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

  it("should raise no notice on a first visit", async () => {
    // El unico modo de "no hay sesion" ahora es que el backend responda 401, y
    // eso se resuelve sin dejar rastro en el almacenamiento.
    const auth = createAuthAdapter({
      refresh: vi.fn().mockRejectedValue(new AuthError("rejected")),
    });
    useSessionStore.setState({ currentUser: null, status: "restoring", tokens: null });

    renderHookWithProviders(() => useAuthSessionBootstrap(), {
      adapters: createAdapters(auth),
    });

    await waitFor(() => expect(useSessionStore.getState().status).toBe("anonymous"));
    expect(useSessionStore.getState().sessionEndReason).toBeNull();
    expect(sessionStorage.length).toBe(0);
  });

  it("should land on a plain login screen when the cookie no longer holds a session", async () => {
    // Con la cookie, "nunca se inicio sesion" y "la sesion caduco" producen el
    // mismo 401: el cliente no puede leer la cookie para distinguirlas. Al cargar
    // la pagina se muestra el login sin explicar nada, que es lo que corresponde
    // a una sesion que ya no existe. El caso "mi sesion caduco mientras la
    // usaba" si se explica, porque ahi sabemos que habia una sesion viva.
    const auth = createAuthAdapter({
      refresh: vi.fn().mockRejectedValue(new AuthError("rejected")),
    });
    useSessionStore.setState({ currentUser: null, status: "restoring", tokens: null });

    renderHookWithProviders(() => useAuthSessionBootstrap(), {
      adapters: createAdapters(auth),
    });

    await waitFor(() => expect(useSessionStore.getState().status).toBe("anonymous"));
    expect(useSessionStore.getState().sessionEndReason).toBeNull();
    expect(useSessionStore.getState().currentUser).toBeNull();
    expect(sessionStorage.length).toBe(0);
  });

  it("should report a throttled refresh as a temporary limit", async () => {
    const auth = createAuthAdapter({
      refresh: vi.fn().mockRejectedValue(new AuthError("throttled")),
    });
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

  it("should discard cached alerts from a previous identity on login", async () => {
    const auth = createAuthAdapter();
    const queryClient = createQueryClient({ defaultOptions: { queries: { retry: false } } });
    queryClient.setQueryData(
      queryKeys.alertsPage("user-0", { isRead: false }, 1),
      createAlertsPage({ total: 2 }),
    );
    queryClient.setQueryData(
      queryKeys.alertsPage(currentUser.id, { isRead: false }, 1),
      createAlertsPage({ total: 1 }),
    );
    const { result } = renderHookWithProviders(() => useLogin(), {
      adapters: createAdapters(auth),
      queryClient,
    });

    await act(async () => {
      await result.current.login({ email: currentUser.email, password: "secret" });
    });

    expect(queryClient.getQueryCache().findAll({ queryKey: ["alerts"] })).toHaveLength(0);
  });

  it("should discard cached alerts on logout", async () => {
    const auth = createAuthAdapter();
    const queryClient = createQueryClient({ defaultOptions: { queries: { retry: false } } });
    useSessionStore.getState().setSession({ currentUser, tokens });
    queryClient.setQueryData(
      queryKeys.alertsPage(currentUser.id, { isRead: false }, 1),
      createAlertsPage({ total: 4 }),
    );
    const { result } = renderHookWithProviders(() => useLogout(), {
      adapters: createAdapters(auth),
      queryClient,
    });

    await act(async () => {
      await result.current.logout();
    });

    expect(queryClient.getQueryCache().findAll({ queryKey: ["alerts"] })).toHaveLength(0);
    expect(useSessionStore.getState().status).toBe("anonymous");
  });

  it("should not restore alerts when the same account signs in again", async () => {
    const auth = createAuthAdapter();
    const queryClient = createQueryClient({ defaultOptions: { queries: { retry: false } } });
    const alertKey = queryKeys.alertsPage(currentUser.id, { isRead: false }, 1);
    const { result } = renderHookWithProviders(() => ({ login: useLogin(), logout: useLogout() }), {
      adapters: createAdapters(auth),
      queryClient,
    });

    await act(async () => {
      await result.current.login.login({ email: currentUser.email, password: "secret" });
    });
    queryClient.setQueryData(alertKey, createAlertsPage({ total: 3 }));
    const generationBeforeLogout = useSessionStore.getState().sessionGeneration;

    await act(async () => {
      await result.current.logout.logout();
    });
    expect(queryClient.getQueryData(alertKey)).toBeUndefined();

    await act(async () => {
      await result.current.login.login({ email: currentUser.email, password: "secret" });
    });

    expect(useSessionStore.getState().sessionGeneration).toBeGreaterThan(generationBeforeLogout);
    expect(queryClient.getQueryData(alertKey)).toBeUndefined();
  });

  it("should keep cached alerts when the access token rotates", async () => {
    vi.useFakeTimers();
    vi.setSystemTime("2026-09-26T12:00:00.000Z");
    const auth = createAuthAdapter({
      login: vi.fn().mockResolvedValue({
        ...tokens,
        accessTokenExpiresAt: "2026-09-26T12:01:01.000Z",
      }),
    });
    const queryClient = createQueryClient({ defaultOptions: { queries: { retry: false } } });
    const alertKey = queryKeys.alertsPage(currentUser.id, { isRead: false }, 1);
    const alertsPage = createAlertsPage({ total: 2 });
    const { result } = renderHookWithProviders(
      () => ({ login: useLogin(), renewal: useProactiveTokenRenewal() }),
      { adapters: createAdapters(auth), queryClient },
    );

    await act(async () => {
      await result.current.login.login({ email: currentUser.email, password: "secret" });
    });
    queryClient.setQueryData(alertKey, alertsPage);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_500);
    });

    expect(auth.refresh).toHaveBeenCalledTimes(1);
    expect(queryClient.getQueryData(alertKey)).toEqual(alertsPage);
  });

  it("should not let an in-flight alert request repopulate the cache after logout", async () => {
    const auth = createAuthAdapter();
    const queryClient = createQueryClient({ defaultOptions: { queries: { retry: false } } });
    useSessionStore.getState().setSession({ currentUser, tokens });
    const alertKey = queryKeys.alertsPage(currentUser.id, { isRead: false }, 1);
    let resolvePage: ((page: ReturnType<typeof createAlertsPage>) => void) | undefined;
    const pendingPage = queryClient
      .fetchQuery({
        queryKey: alertKey,
        queryFn: () =>
          new Promise<ReturnType<typeof createAlertsPage>>((resolve) => {
            resolvePage = resolve;
          }),
      })
      .catch(() => undefined);
    const { result } = renderHookWithProviders(() => useLogout(), {
      adapters: createAdapters(auth),
      queryClient,
    });

    await act(async () => {
      await result.current.logout();
    });

    resolvePage?.(createAlertsPage({ total: 2 }));
    await pendingPage;

    expect(queryClient.getQueryData(alertKey)).toBeUndefined();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
    clearPersistedQueryCache();
  });
});
