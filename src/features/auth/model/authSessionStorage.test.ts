import { describe, expect, it } from "vitest";

import type { AuthTokens } from "@/types/domain";

import {
  AUTH_REFRESH_STORAGE_KEY,
  clearStoredRefreshSession,
  readStoredRefreshSession,
  writeStoredRefreshSession,
} from "./authSessionStorage";

const tokens: AuthTokens = {
  accessToken: "access-token",
  accessTokenExpiresAt: "2026-09-26T12:00:00.000Z",
  refreshToken: "refresh-token",
  refreshTokenExpiresAt: "2026-10-03T12:00:00.000Z",
  tokenType: "Bearer",
};

function createMemoryStorage(): Storage {
  const values = new Map<string, string>();

  return {
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    get length() {
      return values.size;
    },
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, value),
  };
}

describe("authSessionStorage", () => {
  it("should store only the refresh credential", () => {
    const storage = createMemoryStorage();

    writeStoredRefreshSession(tokens, storage);

    expect(JSON.parse(String(storage.getItem(AUTH_REFRESH_STORAGE_KEY)))).toEqual({
      refreshToken: "refresh-token",
      refreshTokenExpiresAt: "2026-10-03T12:00:00.000Z",
    });
  });

  it("should report an absent credential", () => {
    const storage = createMemoryStorage();

    expect(readStoredRefreshSession(storage)).toEqual({ kind: "absent" });
  });

  it("should read a valid refresh credential", () => {
    const storage = createMemoryStorage();
    writeStoredRefreshSession(tokens, storage);

    expect(readStoredRefreshSession(storage, Date.parse("2026-09-27T00:00:00.000Z"))).toEqual({
      kind: "session",
      session: {
        refreshToken: "refresh-token",
        refreshTokenExpiresAt: "2026-10-03T12:00:00.000Z",
      },
    });
  });

  it("should report an expired credential and remove it", () => {
    const storage = createMemoryStorage();
    writeStoredRefreshSession(tokens, storage);

    expect(readStoredRefreshSession(storage, Date.parse("2026-10-04T00:00:00.000Z"))).toEqual({
      kind: "expired",
    });
    expect(storage.getItem(AUTH_REFRESH_STORAGE_KEY)).toBeNull();
  });

  it("should report a malformed credential and remove it", () => {
    const storage = createMemoryStorage();
    storage.setItem(AUTH_REFRESH_STORAGE_KEY, "not-json");

    expect(readStoredRefreshSession(storage)).toEqual({ kind: "invalid" });
    expect(storage.getItem(AUTH_REFRESH_STORAGE_KEY)).toBeNull();
  });

  it("should report a credential with an unparsable expiration as invalid", () => {
    const storage = createMemoryStorage();
    storage.setItem(
      AUTH_REFRESH_STORAGE_KEY,
      JSON.stringify({ refreshToken: "token", refreshTokenExpiresAt: "not-a-date" }),
    );

    expect(readStoredRefreshSession(storage)).toEqual({ kind: "invalid" });
  });

  it("should report a credential without an expiration as invalid", () => {
    const storage = createMemoryStorage();
    storage.setItem(AUTH_REFRESH_STORAGE_KEY, JSON.stringify({ refreshToken: "token" }));

    expect(readStoredRefreshSession(storage)).toEqual({ kind: "invalid" });
  });

  it("should report a credential without a token as invalid", () => {
    const storage = createMemoryStorage();
    storage.setItem(
      AUTH_REFRESH_STORAGE_KEY,
      JSON.stringify({ refreshTokenExpiresAt: "2026-10-03T12:00:00.000Z" }),
    );

    expect(readStoredRefreshSession(storage)).toEqual({ kind: "invalid" });
  });

  it("should report a non-object payload as invalid", () => {
    const storage = createMemoryStorage();
    storage.setItem(AUTH_REFRESH_STORAGE_KEY, JSON.stringify(["refresh-token"]));

    expect(readStoredRefreshSession(storage)).toEqual({ kind: "invalid" });
  });

  it("should clear the stored refresh credential", () => {
    const storage = createMemoryStorage();
    writeStoredRefreshSession(tokens, storage);

    clearStoredRefreshSession(storage);

    expect(storage.getItem(AUTH_REFRESH_STORAGE_KEY)).toBeNull();
  });
});
