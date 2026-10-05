import { useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { useAppAdapters, type AuthCredentials } from "@/app/adapters/context";
import { clearPersistedQueryCache } from "@/app/query/cache";
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
  const queryClient = useQueryClient();
  useEffect(() => {
    return coordinator.subscribe((session) => {
      if (session) {
        if (useSessionStore.getState().currentUser?.id !== session.currentUser.id) {
          clearPreviousIdentityState(queryClient);
        }
        useSessionStore.getState().setSession(session);

        return;
      }

      clearPreviousIdentityState(queryClient);
      useSessionStore.getState().clearSession();
    });
  }, [coordinator, queryClient]);
}

/**
 * Purga los restos de la identidad ANTERIOR: cache persistida, cliente de
 * queries, contexto de trabajo y preferencia de unidad.
 *
 * No toca la sesion. Para cuando se llama, el coordinador ya la adoptó, y
 * borrarla aqui dejaria al usuario en anonimo justo despues de iniciar sesion.
 * `useLogout` revoca la sesion en el servidor antes de limpiar el estado local.
 */
function clearPreviousIdentityState(queryClient: QueryClient): void {
  clearPersistedQueryCache();
  window.localStorage.removeItem(LEGACY_SESSION_STORAGE_KEY);
  queryClient.clear();
  // Un login invalida la sesion anterior aunque sea de la misma cuenta: los callbacks en vuelo de
  // sus acciones ya no pueden restaurar nada sobre la cache recien limpiada.
  useSessionStore.getState().advanceSessionGeneration();
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
      // traves de la suscripcion. Solo el access token permanece en memoria;
      // el refresh token no es legible por JavaScript.
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
      await auth.logout();
      getSessionCoordinator(auth).end();
      clearPreviousIdentityState(queryClient);
      useSessionStore.getState().clearSession();
    },
  });

  return {
    errorMessage: mutation.isError
      ? "No se pudo cerrar la sesion en el servidor. Compruebe su conexion e intente de nuevo."
      : null,
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
        if (isCancelled || (error instanceof SessionRenewalError && error.superseded)) {
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
    let cancelled = false;
    let refreshTimer: number | undefined;
    const renew = () => {
      void coordinator.renew().catch((error: unknown) => {
        if (cancelled || (error instanceof SessionRenewalError && error.superseded)) return;
        if (error instanceof SessionRenewalError && !error.transient) {
          if (useSessionStore.getState().status === "authenticated") {
            coordinator.end();
            endAuthSession(queryClient, toSessionEndReason(error));
          }
          return;
        }
        // El temporizador anterior ya se consumio. Un error de red o 429 debe
        // programar otro intento, sin destruir la sesion ni crear un bucle rapido.
        refreshTimer = window.setTimeout(renew, 30_000);
      });
    };
    const resume = () => {
      if (document.visibilityState === "hidden") return;
      if (
        useSessionStore.getState().status === "authenticated" &&
        coordinator.getRefreshDelay() > 0
      )
        return;
      window.clearTimeout(refreshTimer);
      renew();
    };

    if (status === "authenticated" && tokens) {
      refreshTimer = window.setTimeout(renew, coordinator.getRefreshDelay());
    }
    window.addEventListener("focus", resume);
    window.addEventListener("online", resume);
    document.addEventListener("visibilitychange", resume);

    return () => {
      cancelled = true;
      window.clearTimeout(refreshTimer);
      window.removeEventListener("focus", resume);
      window.removeEventListener("online", resume);
      document.removeEventListener("visibilitychange", resume);
    };
  }, [coordinator, queryClient, status, tokens]);
}
