import { describe, expect, it, vi } from "vitest";

import type { AuthAdapter } from "@/app/adapters";
import type { AuthenticatedUser, AuthTokens } from "@/types/domain";

import {
  createAuthSession,
  getAuthRefreshDelay,
  MAX_AUTH_REFRESH_DELAY_MS,
  restoreAuthSession,
  restoreAuthSessionOnce,
} from "./authSession";

const tokens: AuthTokens = {
  accessToken: "access-token",
  accessTokenExpiresAt: "2026-09-26T12:00:00.000Z",
  refreshToken: "refresh-token",
  refreshTokenExpiresAt: "2026-10-03T12:00:00.000Z",
  tokenType: "Bearer",
};

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

function createAuthAdapter(overrides: Partial<AuthAdapter> = {}): AuthAdapter {
  return {
    loadCurrentUser: vi.fn().mockResolvedValue(currentUser),
    login: vi.fn().mockResolvedValue(tokens),
    logout: vi.fn().mockResolvedValue(undefined),
    refresh: vi.fn().mockResolvedValue(tokens),
    ...overrides,
  };
}

describe("authSession", () => {
  it("should refresh one minute before access-token expiration", () => {
    expect(
      getAuthRefreshDelay("2026-09-26T12:05:00.000Z", Date.parse("2026-09-26T12:00:00.000Z")),
    ).toBe(4 * 60 * 1000);
    expect(
      getAuthRefreshDelay("2026-09-26T11:59:00.000Z", Date.parse("2026-09-26T12:00:00.000Z")),
    ).toBe(0);
    expect(getAuthRefreshDelay("2099-01-01T00:00:00.000Z", 0)).toBe(MAX_AUTH_REFRESH_DELAY_MS);
  });

  it("should create a session from credentials and the authenticated profile", async () => {
    const adapter = createAuthAdapter();

    await expect(
      createAuthSession(adapter, { email: "admin@example.edu", password: "secret" }),
    ).resolves.toEqual({ currentUser, tokens });
    expect(adapter.loadCurrentUser).toHaveBeenCalledWith(tokens.accessToken);
  });

  it("should revoke tokens when profile loading fails after login", async () => {
    const profileError = new Error("profile unavailable");
    const adapter = createAuthAdapter({
      loadCurrentUser: vi.fn().mockRejectedValue(profileError),
    });

    await expect(
      createAuthSession(adapter, { email: "admin@example.edu", password: "secret" }),
    ).rejects.toBe(profileError);
    expect(adapter.logout).toHaveBeenCalledWith(tokens.refreshToken);
  });

  it("should restore a session by rotating the refresh credential first", async () => {
    const adapter = createAuthAdapter();

    await expect(restoreAuthSession(adapter, "old-refresh-token")).resolves.toEqual({
      currentUser,
      tokens,
    });
    expect(adapter.refresh).toHaveBeenCalledWith("old-refresh-token");
    expect(adapter.loadCurrentUser).toHaveBeenCalledWith(tokens.accessToken);
  });

  it("should share concurrent restoration attempts for the same adapter", async () => {
    let resolveRefresh: ((value: AuthTokens) => void) | undefined;
    const refresh = vi.fn(
      () =>
        new Promise<AuthTokens>((resolve) => {
          resolveRefresh = resolve;
        }),
    );
    const adapter = createAuthAdapter({ refresh });

    const firstRestoration = restoreAuthSessionOnce(adapter, "old-refresh-token");
    const secondRestoration = restoreAuthSessionOnce(adapter, "old-refresh-token");

    expect(refresh).toHaveBeenCalledTimes(1);
    resolveRefresh?.(tokens);

    await expect(Promise.all([firstRestoration, secondRestoration])).resolves.toEqual([
      { currentUser, tokens },
      { currentUser, tokens },
    ]);
  });
});
