import type { AuthTokens } from "@/types/domain";

export const AUTH_REFRESH_STORAGE_KEY = "sipeg-auth-refresh";

export type StoredRefreshSession = Pick<AuthTokens, "refreshToken" | "refreshTokenExpiresAt">;

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
): StoredRefreshSession | null {
  const serializedSession = storage.getItem(AUTH_REFRESH_STORAGE_KEY);

  if (!serializedSession) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(serializedSession);

    if (!isRecord(parsed)) {
      throw new Error("invalid session");
    }

    const refreshToken = parsed["refreshToken"];
    const refreshTokenExpiresAt = parsed["refreshTokenExpiresAt"];

    if (
      typeof refreshToken !== "string" ||
      refreshToken.length === 0 ||
      typeof refreshTokenExpiresAt !== "string" ||
      Number.isNaN(Date.parse(refreshTokenExpiresAt)) ||
      Date.parse(refreshTokenExpiresAt) <= now
    ) {
      throw new Error("invalid session");
    }

    return { refreshToken, refreshTokenExpiresAt };
  } catch {
    clearStoredRefreshSession(storage);
    return null;
  }
}
