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
  refreshTokenExpiresAt: "2026-10-03T12:00:00.000Z",
  tokenType: "Bearer",
};

describe("useSessionStore", () => {
  beforeEach(() => {
    useSessionStore.setState({
      currentUser: null,
      sessionEndReason: null,
      sessionGeneration: 0,
      status: "restoring",
      tokens: null,
    });
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

  it("should preserve a session adopted before restoration finishes", () => {
    useSessionStore.getState().setSession({ currentUser, tokens });
    useSessionStore.getState().finishRestoration();

    expect(useSessionStore.getState()).toMatchObject({
      currentUser,
      status: "authenticated",
      tokens,
    });
  });

  it("should replace the profile while preserving the session credentials", () => {
    useSessionStore.getState().setSession({ currentUser, tokens });
    const rotatedTokens = { ...tokens, accessToken: "rotated-access-token" };
    useSessionStore.setState({ tokens: rotatedTokens });
    const updatedUser = { ...currentUser, firstName: "Mariana Paula" };

    useSessionStore.getState().replaceCurrentUser(updatedUser);

    expect(useSessionStore.getState()).toMatchObject({
      currentUser: updatedUser,
      status: "authenticated",
      tokens: rotatedTokens,
    });
  });

  it("should not write the replaced profile to persistent storage", () => {
    useSessionStore.getState().setSession({ currentUser, tokens });

    useSessionStore.getState().replaceCurrentUser({ ...currentUser, firstName: "Mariana Paula" });

    expect(localStorage.getItem("sipeg-session")).toBeNull();
    expect(sessionStorage.getItem("sipeg-auth-refresh")).toBeNull();
  });

  it("should ignore a profile update when there is no authenticated user", () => {
    useSessionStore.getState().setSession({ currentUser, tokens });
    useSessionStore.getState().clearSession();

    useSessionStore.getState().replaceCurrentUser({ ...currentUser, firstName: "Mariana Paula" });

    expect(useSessionStore.getState().currentUser).toBeNull();
  });

  it("should ignore a profile update that belongs to another identity", () => {
    useSessionStore.getState().setSession({ currentUser, tokens });
    const otherSession = { currentUser: { ...currentUser, id: "user-2" }, tokens };

    useSessionStore.getState().setSession(otherSession);
    useSessionStore.getState().replaceCurrentUser({ ...currentUser, firstName: "Mariana Paula" });

    expect(useSessionStore.getState().currentUser?.firstName).toBe("Mariana");
  });

  it("should record why the session ended and drop the identity", () => {
    useSessionStore.getState().setSession({ currentUser, tokens });

    useSessionStore.getState().endSession("expired");

    expect(useSessionStore.getState()).toMatchObject({
      currentUser: null,
      sessionEndReason: "expired",
      status: "anonymous",
      tokens: null,
    });
  });

  it("should not persist the session end reason", () => {
    useSessionStore.getState().setSession({ currentUser, tokens });

    useSessionStore.getState().endSession("throttled");

    expect(localStorage.getItem("sipeg-session")).toBeNull();
    expect(sessionStorage.getItem("sipeg-auth-refresh")).toBeNull();
    expect(sessionStorage.getItem("sipeg-session-end")).toBeNull();
    expect(localStorage.getItem("sipeg-session-end")).toBeNull();
  });

  it("should clear the reason after a successful login", () => {
    useSessionStore.getState().endSession("expired");

    useSessionStore.getState().setSession({ currentUser, tokens });

    expect(useSessionStore.getState().sessionEndReason).toBeNull();
  });

  it("should clear the reason after a voluntary logout", () => {
    useSessionStore.getState().setSession({ currentUser, tokens });
    useSessionStore.getState().endSession("expired");

    useSessionStore.getState().clearSession();

    expect(useSessionStore.getState().sessionEndReason).toBeNull();
  });

  it("should start a new session generation when an identity begins", () => {
    expect(useSessionStore.getState().sessionGeneration).toBe(0);

    useSessionStore.getState().setSession({ currentUser, tokens });

    expect(useSessionStore.getState().sessionGeneration).toBe(1);
  });

  it("should advance the session generation when a different identity starts", () => {
    useSessionStore.getState().setSession({ currentUser, tokens });
    const generation = useSessionStore.getState().sessionGeneration;

    useSessionStore.getState().setSession({
      currentUser: { ...currentUser, id: "user-2" },
      tokens,
    });

    expect(useSessionStore.getState().sessionGeneration).toBe(generation + 1);
  });

  it("should advance the session generation when the session is cleared or ended", () => {
    useSessionStore.getState().setSession({ currentUser, tokens });
    const afterLogin = useSessionStore.getState().sessionGeneration;

    useSessionStore.getState().endSession("expired");
    expect(useSessionStore.getState().sessionGeneration).toBe(afterLogin + 1);

    useSessionStore.getState().setSession({ currentUser, tokens });
    const afterSecondLogin = useSessionStore.getState().sessionGeneration;

    useSessionStore.getState().clearSession();
    expect(useSessionStore.getState().sessionGeneration).toBe(afterSecondLogin + 1);
  });

  it("should keep the session generation across token rotations and profile updates", () => {
    useSessionStore.getState().setSession({ currentUser, tokens });
    const generation = useSessionStore.getState().sessionGeneration;

    useSessionStore
      .getState()
      .setSession({ currentUser, tokens: { ...tokens, accessToken: "rotated-access-token" } });
    useSessionStore.getState().replaceCurrentUser({ ...currentUser, firstName: "Mariana Paula" });

    expect(useSessionStore.getState().sessionGeneration).toBe(generation);
  });

  it("should advance the session generation on demand", () => {
    const generation = useSessionStore.getState().sessionGeneration;

    useSessionStore.getState().advanceSessionGeneration();

    expect(useSessionStore.getState().sessionGeneration).toBe(generation + 1);
  });
});
