import type { AuthAdapter, AuthCredentials } from "@/app/adapters";
import type { AuthenticatedUser, AuthTokens } from "@/types/domain";

export type AuthSession = {
  currentUser: AuthenticatedUser;
  tokens: AuthTokens;
};

const AUTH_REFRESH_SKEW_MS = 60 * 1000;
export const MAX_AUTH_REFRESH_DELAY_MS = 2_147_483_647;

const restorationByAdapter = new WeakMap<AuthAdapter, Promise<AuthSession>>();

export function getAuthRefreshDelay(
  accessTokenExpiresAt: string,
  now: number = Date.now(),
): number {
  const expiration = Date.parse(accessTokenExpiresAt);

  if (Number.isNaN(expiration)) {
    return 0;
  }

  return Math.min(MAX_AUTH_REFRESH_DELAY_MS, Math.max(0, expiration - now - AUTH_REFRESH_SKEW_MS));
}

async function loadSessionProfile(auth: AuthAdapter, tokens: AuthTokens): Promise<AuthSession> {
  try {
    const currentUser = await auth.loadCurrentUser(tokens.accessToken);

    return { currentUser, tokens };
  } catch (error) {
    await auth.logout(tokens.refreshToken).catch(() => undefined);
    throw error;
  }
}

export async function createAuthSession(
  auth: AuthAdapter,
  credentials: AuthCredentials,
): Promise<AuthSession> {
  const tokens = await auth.login(credentials);

  return loadSessionProfile(auth, tokens);
}

export async function restoreAuthSession(
  auth: AuthAdapter,
  refreshToken: string,
): Promise<AuthSession> {
  const tokens = await auth.refresh(refreshToken);

  return loadSessionProfile(auth, tokens);
}

export function restoreAuthSessionOnce(
  auth: AuthAdapter,
  refreshToken: string,
): Promise<AuthSession> {
  const currentRestoration = restorationByAdapter.get(auth);

  if (currentRestoration) {
    return currentRestoration;
  }

  const restoration = restoreAuthSession(auth, refreshToken).finally(() => {
    restorationByAdapter.delete(auth);
  });

  restorationByAdapter.set(auth, restoration);
  return restoration;
}
