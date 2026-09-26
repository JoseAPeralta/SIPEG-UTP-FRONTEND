import { beforeEach, describe, expect, it } from "vitest";

import type { AuthenticatedUser, AuthTokens } from "@/types/domain";

import { useSessionStore } from "./session";

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
  accessTokenExpiresAt: "2026-09-26T12:00:00.000Z",
  refreshToken: "refresh-token",
  refreshTokenExpiresAt: "2026-10-03T12:00:00.000Z",
  tokenType: "Bearer",
};

describe("useSessionStore", () => {
  beforeEach(() => {
    useSessionStore.setState({ currentUser: null, status: "restoring", tokens: null });
    localStorage.clear();
  });

  it("should establish an authenticated in-memory session", () => {
    useSessionStore.getState().setSession({ currentUser, tokens });

    expect(useSessionStore.getState()).toMatchObject({
      currentUser,
      status: "authenticated",
      tokens,
    });
    expect(localStorage.getItem("sipeg-session")).toBeNull();
  });

  it("should finish restoration without authenticating", () => {
    useSessionStore.getState().finishRestoration();

    expect(useSessionStore.getState().status).toBe("anonymous");
  });

  it("should clear all in-memory session data", () => {
    useSessionStore.getState().setSession({ currentUser, tokens });

    useSessionStore.getState().clearSession();

    expect(useSessionStore.getState()).toMatchObject({
      currentUser: null,
      status: "anonymous",
      tokens: null,
    });
  });
});
