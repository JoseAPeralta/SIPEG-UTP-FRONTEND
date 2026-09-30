import type { AuthTokens } from "@/types/domain";

export const AUTH_REFRESH_STORAGE_KEY = "sipeg-auth-refresh";

export type StoredRefreshSession = Pick<AuthTokens, "refreshToken" | "refreshTokenExpiresAt">;

/**
 * Why a stored refresh credential is or is not usable. The distinction matters for the user: an
 * expired credential means a session actually existed and ended, while an absent or malformed one
 * is the normal first visit and must not raise any notice.
 */
export type StoredRefreshSessionResult =
  | { kind: "absent" }
  | { kind: "invalid" }
  | { kind: "expired" }
  | { kind: "session"; session: StoredRefreshSession };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function clearStoredRefreshSession(storage: Storage = window.sessionStorage): void {
  storage.removeItem(AUTH_REFRESH_STORAGE_KEY);
}

export function writeStoredRefreshSession(
  tokens: AuthTokens,
  storage: Storage = window.sessionStorage,
): void {
  const storedSession: StoredRefreshSession = {
    refreshToken: tokens.refreshToken,
    refreshTokenExpiresAt: tokens.refreshTokenExpiresAt,
  };

  storage.setItem(AUTH_REFRESH_STORAGE_KEY, JSON.stringify(storedSession));
}

export function readStoredRefreshSession(
  storage: Storage = window.sessionStorage,
  now: number = Date.now(),
): StoredRefreshSessionResult {
  const serializedSession = storage.getItem(AUTH_REFRESH_STORAGE_KEY);

  if (!serializedSession) {
    return { kind: "absent" };
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(serializedSession);
  } catch {
    clearStoredRefreshSession(storage);

    return { kind: "invalid" };
  }

  if (!isRecord(parsed)) {
    clearStoredRefreshSession(storage);

    return { kind: "invalid" };
  }

  const refreshToken = parsed["refreshToken"];
  const refreshTokenExpiresAt = parsed["refreshTokenExpiresAt"];

  if (typeof refreshToken !== "string" || refreshToken.length === 0) {
    clearStoredRefreshSession(storage);

    return { kind: "invalid" };
  }

  if (typeof refreshTokenExpiresAt !== "string") {
    clearStoredRefreshSession(storage);

    return { kind: "invalid" };
  }

  const expiration = Date.parse(refreshTokenExpiresAt);

  if (Number.isNaN(expiration)) {
    clearStoredRefreshSession(storage);

    return { kind: "invalid" };
  }

  if (expiration <= now) {
    clearStoredRefreshSession(storage);

    return { kind: "expired" };
  }

  return { kind: "session", session: { refreshToken, refreshTokenExpiresAt } };
}
