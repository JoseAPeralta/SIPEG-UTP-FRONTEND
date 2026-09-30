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
  createSessionCoordinator,
  SessionRenewalError,
  type SessionCoordinator,
} from "../model/authSession";
import { endAuthSession } from "../model/endAuthSession";

const LEGACY_SESSION_STORAGE_KEY = "sipeg-session";

/**
 * Un coordinador por pestana. `useLogin` y `useAuthSessionBootstrap` lo comparten
 * para que ambos operen sobre la misma sesion en memoria; el store se mantiene
 * sincronizado con el a traves de `subscribe`.
 */
const coordinatorByAdapter = new WeakMap<object, SessionCoordinator>();

function getSessionCoordinator(
  auth: Parameters<typeof createSessionCoordinator>[0],
): SessionCoordinator {
  const existing = coordinatorByAdapter.get(auth);

  if (existing) {
    return existing;
  }

  const created = createSessionCoordinator(auth);
  coordinatorByAdapter.set(auth, created);

  return created;
}

/**
 * Espeja el estado del coordinador en el store.
 *
 * Vive en un hook propio, y no dentro de `useAuthSessionBootstrap`, porque lo
 * necesitan tanto el login como el arranque: sin esto, un login correcto dejaria
 * la sesion en el coordinador pero el store seguiria en anonimo, y la rotacion
 * proativa no tendria nada que renovar.
 *
 * El store tiene un solo escritor. Ni `onSuccess` ni los errores tocan
 * `setSession` directamente.
 */
function useSessionStoreSync(coordinator: SessionCoordinator): void {
  useEffect(() => {
    return coordinator.subscribe((session) => {
      if (session) {
        useSessionStore.getState().setSession(session);

        return;
      }

      // Una renovacion que termino en 401, o un logout en otra pestana, terminan
      // la sesion aqui tambien. Un fallo transitorio (429 o red) nunca pasa por
      // aqui: `renew` lo propaga sin limpiar nada.
      if (useSessionStore.getState().status === "authenticated") {
        return;
      }

      useSessionStore.getState().clearSession();
    });
  }, [coordinator]);
}

/**
 * Purga los restos de la identidad ANTERIOR: cache persistida, cliente de
 * queries, contexto de trabajo y preferencia de unidad.
 *
 * No toca la sesion. Para cuando se llama, el coordinador ya la adoptó, y
 * borrarla aqui dejaria al usuario en anonimo justo despues de iniciar sesion.
 * Cerrar la sesion es cosa de `endAuthSession`, que ademas aviva al servidor.
 */
function clearPreviousIdentityState(queryClient: QueryClient): void {
  clearPersistedQueryCache();
  window.localStorage.removeItem(LEGACY_SESSION_STORAGE_KEY);
  queryClient.clear();
  useWorkingContextStore.getState().clearWorkingContext();
  useUnitPreferenceStore.getState().setSelectedUnitId("all");
}

/**
 * Derives why a session can no longer be restored. A rejected or expired credential reads as an
 * expired session, a temporary limit as throttling, and anything else as a service problem, so a
 * network outage is never reported to the user as a lost account.
 */
function toSessionEndReason(error: unknown): SessionEndReason {
  // Un fallo de renovacion ya trae su clasificacion; el resto se traduce aqui.
  const failure = error instanceof SessionRenewalError ? error.failure : toAuthError(error).failure;

  if (failure === "throttled") {
    return "throttled";
  }

  if (failure === "rejected") {
    return "expired";
  }

  return "unavailable";
}

export function useLogin() {
  const { auth } = useAppAdapters();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    // El login pasa por el coordinador y no por un camino aparte: asi la
    // rotacion proactiva sabe cuanto falta para renovar. Un login que esquivara
    // el coordinador abriria una sesion que nunca se renueva sola.
    mutationFn: (credentials: AuthCredentials) =>
      getSessionCoordinator(auth)
        .establish(credentials)
        .catch((error: unknown) => {
          throw toAuthError(error);
        }),
    onSuccess: () => {
      // El login ya fijo la cookie en el servidor. Se purga lo que dejo la
      // identidad anterior y la sesion nueva queda adoptada por el coordinador a
      // traves de la suscripcion. Ninguna credencial se guarda: ninguna es legible
      // por JavaScript.
      clearPreviousIdentityState(queryClient);
    },
  });

  useSessionStoreSync(getSessionCoordinator(auth));

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
      // Sin token que enviar: el backend lo lee de la cookie y la borra. Se
      // intenta igualmente porque hace falta revocar la sesion en el servidor, no
      // solo limpiarla en esta pestana.
      await auth.logout().catch(() => undefined);
      getSessionCoordinator(auth).end();
      clearPreviousIdentityState(queryClient);
      useSessionStore.getState().clearSession();
    },
  });

  return {
    isPending: mutation.isPending,
    logout: mutation.mutateAsync,
  };
}

/**
 * Restaura la sesion al cargar.
 *
 * Ya no hay nada que leer del almacenamiento: se llama a `refresh` y el backend
 * responde con la sesion si la cookie sigue viva. Eso es justo lo que hace que
 * **una pestana nueva quede autenticada sin volver a iniciar sesion**, que era el
 * problema original, y ademas cubre la recarga y el back/forward del navegador.
 */
export function useAuthSessionBootstrap(): void {
  const { auth } = useAppAdapters();
  const queryClient = useQueryClient();
  const status = useSessionStore((state) => state.status);
  const coordinator = getSessionCoordinator(auth);

  useSessionStoreSync(coordinator);

  useEffect(() => {
    if (status !== "restoring") {
      return;
    }

    window.localStorage.removeItem(LEGACY_SESSION_STORAGE_KEY);
    let isCancelled = false;

    void coordinator
      .renew()
      .then(() => {
        if (isCancelled) {
          return;
        }

        useSessionStore.getState().finishRestoration();
      })
      .catch((error: unknown) => {
        if (isCancelled) {
          return;
        }

        // Sin cookie no hay sesion: es el caso normal de un visitante anonimo, y
        // no es un error que haya que mostrar.
        if (error instanceof SessionRenewalError && !error.transient) {
          useSessionStore.getState().finishRestoration();

          return;
        }

        endAuthSession(queryClient, toSessionEndReason(error));
      });

    return () => {
      isCancelled = true;
    };
  }, [coordinator, queryClient, status]);
}

/**
 * Renueva el access token antes de que caduque, mientras haya sesion.
 *
 * Va en su propio hook, y no dentro del de arranque, porque es una preocupacion
 * distinta: el arranque ocurre una vez al cargar, esto ocurre cada quince
 * minutos. Mezclarlos hacia que el temporizador solo existiera por el hecho de
 * que `App` monta el hook de arranque.
 *
 * Un fallo transitorio (429 o red) **no** cierra la sesion. Solo un 401 la
 * termina, porque el usuario volveria a tenerla al minuto sin haber hecho nada.
 */
export function useProactiveTokenRenewal(): void {
  const { auth } = useAppAdapters();
  const queryClient = useQueryClient();
  const status = useSessionStore((state) => state.status);
  const tokens = useSessionStore((state) => state.tokens);
  const coordinator = getSessionCoordinator(auth);

  useEffect(() => {
    if (status !== "authenticated" || !tokens) {
      return;
    }

    const refreshTimer = window.setTimeout(() => {
      void coordinator.renew().catch((error: unknown) => {
        if (error instanceof SessionRenewalError && !error.transient) {
          endAuthSession(queryClient, toSessionEndReason(error));
        }
      });
    }, coordinator.getRefreshDelay());

    return () => window.clearTimeout(refreshTimer);
  }, [coordinator, queryClient, status, tokens]);
}
