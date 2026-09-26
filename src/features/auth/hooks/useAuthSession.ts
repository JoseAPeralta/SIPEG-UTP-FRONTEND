import { useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { useAppAdapters, type AuthCredentials } from "@/app/adapters";
import { clearPersistedQueryCache } from "@/app/query";
import { useSessionStore } from "@/store/session";
import { useUnitPreferenceStore } from "@/store/unitPreference";
import { useWorkingContextStore } from "@/store/workingContext";

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

export function useLogin() {
  const { auth } = useAppAdapters();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (credentials: AuthCredentials) => createAuthSession(auth, credentials),
    onSuccess: (session) => {
      clearIdentityState(queryClient);
      writeStoredRefreshSession(session.tokens);
      useSessionStore.getState().setSession(session);
    },
  });

  return {
    error: mutation.error,
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
        useSessionStore.getState().tokens?.refreshToken ?? storedSession?.refreshToken;

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

    if (!storedSession) {
      useSessionStore.getState().finishRestoration();
      return;
    }

    let isCancelled = false;

    void restoreAuthSessionOnce(auth, storedSession.refreshToken)
      .then((session) => {
        if (isCancelled) {
          return;
        }

        writeStoredRefreshSession(session.tokens);
        useSessionStore.getState().setSession(session);
      })
      .catch(() => {
        if (!isCancelled) {
          clearIdentityState(queryClient);
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
        .catch(() => clearIdentityState(queryClient));
    }, getAuthRefreshDelay(tokens.accessTokenExpiresAt));

    return () => window.clearTimeout(refreshTimer);
  }, [auth, queryClient, status, tokens]);
}
