import { useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { useAppAdapters, type AuthCredentials } from "@/app/adapters";
import { clearPersistedQueryCache } from "@/app/query";
import { useSessionStore } from "@/store/session";
import { useUnitPreferenceStore } from "@/store/unitPreference";
import { useWorkingContextStore } from "@/store/workingContext";
import type { SessionEndReason } from "@/types/domain";

import { AuthError, toAuthError } from "../adapters/authFailure";
import {
  createAuthSession,
  getAuthRefreshDelay,
  restoreAuthSessionOnce,
} from "../model/authSession";
import {
  clearStoredRefreshSession,
  readStoredRefreshSession,
  writeStoredRefreshSession,
} from "../model/authSessionStorage";
import { endAuthSession } from "../model/endAuthSession";

const LEGACY_SESSION_STORAGE_KEY = "sipeg-session";

function clearIdentityState(queryClient: QueryClient): void {
  clearStoredRefreshSession();
  clearPersistedQueryCache();
  window.localStorage.removeItem(LEGACY_SESSION_STORAGE_KEY);
  queryClient.clear();
  useWorkingContextStore.getState().clearWorkingContext();
  useUnitPreferenceStore.getState().setSelectedUnitId("all");
  useSessionStore.getState().clearSession();
}

/**
 * Derives why a session can no longer be restored. A rejected or expired credential reads as an
 * expired session, a temporary limit as throttling, and anything else as a service problem, so a
 * network outage is never reported to the user as a lost account.
 */
function toSessionEndReason(error: unknown): SessionEndReason {
  const failure = toAuthError(error).failure;

  if (failure === "throttled") {
    return "throttled";
  }

  if (failure === "rejected") {
    return "expired";
  }

  return "unavailable";
}

/**
 * A restoration that finishes after the user already signed in belongs to a previous identity, so
 * its failure must neither tear down the new session nor raise a notice about it.
 */
function endIdentityForRestoration(queryClient: QueryClient, error: unknown): void {
  if (useSessionStore.getState().status === "authenticated") {
    return;
  }

  endAuthSession(queryClient, toSessionEndReason(error));
}

export function useLogin() {
  const { auth } = useAppAdapters();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (credentials: AuthCredentials) =>
      createAuthSession(auth, credentials).catch((error: unknown) => {
        throw toAuthError(error);
      }),
    onSuccess: (session) => {
      clearIdentityState(queryClient);
      writeStoredRefreshSession(session.tokens);
      useSessionStore.getState().setSession(session);
    },
  });

  return {
    errorMessage: mutation.error instanceof AuthError ? mutation.error.message : null,
    failure: mutation.error instanceof AuthError ? mutation.error.failure : null,
    isPending: mutation.isPending,
    login: mutation.mutateAsync,
  };
}

export function useLogout() {
  const { auth } = useAppAdapters();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async () => {
      const storedSession = readStoredRefreshSession();
      const refreshToken =
        useSessionStore.getState().tokens?.refreshToken ??
        (storedSession.kind === "session" ? storedSession.session.refreshToken : undefined);

      if (refreshToken) {
        await auth.logout(refreshToken).catch(() => undefined);
      }

      clearIdentityState(queryClient);
    },
  });

  return {
    isPending: mutation.isPending,
    logout: mutation.mutateAsync,
  };
}

export function useAuthSessionBootstrap(): void {
  const { auth } = useAppAdapters();
  const queryClient = useQueryClient();
  const status = useSessionStore((state) => state.status);
  const tokens = useSessionStore((state) => state.tokens);

  useEffect(() => {
    if (status !== "restoring") {
      return;
    }

    window.localStorage.removeItem(LEGACY_SESSION_STORAGE_KEY);
    const storedSession = readStoredRefreshSession();

    if (storedSession.kind === "absent" || storedSession.kind === "invalid") {
      useSessionStore.getState().finishRestoration();

      return;
    }

    if (storedSession.kind === "expired") {
      endAuthSession(queryClient, "expired");

      return;
    }

    let isCancelled = false;

    void restoreAuthSessionOnce(auth, storedSession.session.refreshToken)
      .then((session) => {
        if (isCancelled) {
          return;
        }

        writeStoredRefreshSession(session.tokens);
        useSessionStore.getState().setSession(session);
      })
      .catch((error: unknown) => {
        if (!isCancelled) {
          endIdentityForRestoration(queryClient, error);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [auth, queryClient, status]);

  useEffect(() => {
    if (status !== "authenticated" || !tokens) {
      return;
    }

    const refreshTimer = window.setTimeout(() => {
      void restoreAuthSessionOnce(auth, tokens.refreshToken)
        .then((session) => {
          writeStoredRefreshSession(session.tokens);
          useSessionStore.getState().setSession(session);
        })
        .catch((error: unknown) => endIdentityForRestoration(queryClient, error));
    }, getAuthRefreshDelay(tokens.accessTokenExpiresAt));

    return () => window.clearTimeout(refreshTimer);
  }, [auth, queryClient, status, tokens]);
}
