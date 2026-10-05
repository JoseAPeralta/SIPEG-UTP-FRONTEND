// @vitest-environment node

import { afterEach, describe, expect, it, vi } from "vitest";

import { createAppAdapters, resolveDataSource } from "./createAppAdapters";
import { OPERATIONS_CONTRACT_PENDING_MESSAGE } from "@/features/operations/adapters";
import { useSessionStore } from "@/store/session";
import { createAuthenticatedUser, createAuthTokens } from "@/test/factories";

describe("resolveDataSource", () => {
  it("should default to the api source", () => {
    expect(resolveDataSource({})).toBe("api");
    expect(resolveDataSource({ VITE_DATA_SOURCE: "unexpected" })).toBe("api");
  });

  it("should select the mock source only when explicitly configured", () => {
    expect(resolveDataSource({ VITE_DATA_SOURCE: "mock" })).toBe("mock");
  });
});

describe("createAppAdapters", () => {
  afterEach(() => {
    useSessionStore.getState().clearSession();
  });

  it("should wire mock adapters when the mock source is explicit", async () => {
    const adapters = createAppAdapters({ source: "mock" });
    const catalog = await adapters.activityCatalog.loadCatalog("public");

    expect(catalog.activities.length).toBeGreaterThan(0);
    expect(adapters.auth.login).toBeTypeOf("function");
    await expect(adapters.alerts.loadAlertsPage({}, 1)).resolves.toBeTruthy();
    await expect(adapters.careers.loadCareers()).resolves.toBeTruthy();
    await expect(adapters.classrooms.loadClassrooms()).resolves.toBeTruthy();
    await expect(adapters.organizationalUnits.loadOrganizationalUnits()).resolves.toBeTruthy();
    expect(adapters.registration.register).toBeTypeOf("function");
    await expect(adapters.users.loadUsers()).resolves.toBeTruthy();
    await expect(adapters.userScopes.loadUserScopes()).resolves.toBeTruthy();
    await expect(adapters.operations.loadOperations()).resolves.toBeTruthy();
  });

  it("should keep operations unavailable while the API source lacks contracts", async () => {
    const adapters = createAppAdapters({ source: "api" });

    expect(adapters.auth.login).toBeTypeOf("function");
    expect(adapters.registration.register).toBeTypeOf("function");
    await expect(adapters.operations.loadOperations()).rejects.toThrow(
      OPERATIONS_CONTRACT_PENDING_MESSAGE,
    );
  });

  it("should authenticate API requests with the in-memory session token", async () => {
    useSessionStore.getState().setSession({
      currentUser: createAuthenticatedUser(),
      tokens: createAuthTokens({ accessToken: "session-access-token" }),
    });
    const fetcher = vi.fn().mockRejectedValue(new TypeError("offline"));
    const adapters = createAppAdapters({ apiOptions: { fetcher }, source: "api" });

    await expect(adapters.activityCatalog.loadCatalog("administrative")).rejects.toThrow(
      /conectar/i,
    );

    const requestInit = fetcher.mock.calls[0]?.[1] as RequestInit | undefined;

    expect(new Headers(requestInit?.headers).get("Authorization")).toBe(
      "Bearer session-access-token",
    );
  });

  it("should keep public catalog requests anonymous even with an authenticated session", async () => {
    useSessionStore.getState().setSession({
      currentUser: createAuthenticatedUser(),
      tokens: createAuthTokens({ accessToken: "session-access-token" }),
    });
    const fetcher = vi.fn().mockRejectedValue(new TypeError("offline"));
    const adapters = createAppAdapters({ apiOptions: { fetcher }, source: "api" });

    await expect(adapters.activityCatalog.loadCatalog("public")).rejects.toThrow(/conectar/i);

    const requestInit = fetcher.mock.calls[0]?.[1] as RequestInit | undefined;

    expect(new Headers(requestInit?.headers).get("Authorization")).toBeNull();
  });

  it("should authenticate the administrative user listing with the in-memory session token", async () => {
    useSessionStore.getState().setSession({
      currentUser: createAuthenticatedUser(),
      tokens: createAuthTokens({ accessToken: "session-access-token" }),
    });
    const fetcher = vi.fn().mockRejectedValue(new TypeError("offline"));
    const adapters = createAppAdapters({ apiOptions: { fetcher }, source: "api" });

    await expect(adapters.users.loadUsers()).rejects.toThrow(/conectar/i);

    const requestInit = fetcher.mock.calls[0]?.[1] as RequestInit | undefined;

    expect(new Headers(requestInit?.headers).get("Authorization")).toBe(
      "Bearer session-access-token",
    );
  });

  it("should authenticate the user scope discovery with the in-memory session token", async () => {
    useSessionStore.getState().setSession({
      currentUser: createAuthenticatedUser(),
      tokens: createAuthTokens({ accessToken: "session-access-token" }),
    });
    const fetcher = vi.fn().mockRejectedValue(new TypeError("offline"));
    const adapters = createAppAdapters({ apiOptions: { fetcher }, source: "api" });

    await expect(adapters.userScopes.loadUserScopes()).rejects.toThrow(/conectar/i);

    const requestInit = fetcher.mock.calls[0]?.[1] as RequestInit | undefined;

    expect(new Headers(requestInit?.headers).get("Authorization")).toBe(
      "Bearer session-access-token",
    );
  });

  it("should authenticate the private alert inbox with the in-memory session token", async () => {
    useSessionStore.getState().setSession({
      currentUser: createAuthenticatedUser(),
      tokens: createAuthTokens({ accessToken: "session-access-token" }),
    });
    const fetcher = vi.fn().mockRejectedValue(new TypeError("offline"));
    const adapters = createAppAdapters({ apiOptions: { fetcher }, source: "api" });

    await expect(adapters.alerts.loadAlertsPage({}, 1)).rejects.toThrow(/conectar/i);

    const requestInit = fetcher.mock.calls[0]?.[1] as RequestInit | undefined;

    expect(new Headers(requestInit?.headers).get("Authorization")).toBe(
      "Bearer session-access-token",
    );
  });
});
