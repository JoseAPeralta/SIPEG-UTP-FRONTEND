import type { AuthAdapter, AuthCredentials } from "@/app/adapters";
import type { AuthenticatedUser, AuthTokens } from "@/types/domain";

import { toAuthError, type AuthFailure } from "../adapters/authFailure";

import {
  createCrossTabSessionBus,
  isCrossTabMessage,
  type CrossTabSessionBus,
} from "./crossTabSession.js";

export type AuthSession = {
  currentUser: AuthenticatedUser;
  tokens: AuthTokens;
};

const AUTH_REFRESH_SKEW_MS = 60 * 1000;
export const MAX_AUTH_REFRESH_DELAY_MS = 2_147_483_647;

/**
 * Fallo de una renovacion. `transient` separa "volvelo a intentar" de "la
 * sesion termino": un 429 o una caida de red no pueden cerrar la sesion del
 * usuario, porque volverian a tenerla un minuto despues sin haber hecho nada.
 */
export class SessionRenewalError extends Error {
  readonly transient: boolean;
  /**
   * Se conserva la clasificacion del fallo original. Sin ella, la UI recibiria
   * siempre "unavailable" y un limite de cuota se mostraria como una caida de
   * servicio.
   */
  readonly failure: AuthFailure;

  constructor(
    message: string,
    transient: boolean,
    failure: AuthFailure,
    readonly superseded = false,
  ) {
    super(message);
    this.name = "SessionRenewalError";
    this.transient = transient;
    this.failure = failure;
  }
}

/**
 * Reutiliza la clasificacion de fallos que ya usa el resto de la aplicacion, en
 * lugar de inspeccionar `status` a mano: asi un rechazo sigue siendo terminal
 * llegue como `ApiError` o como `AuthError`, y no hay dos verdades.
 */
export type SessionCoordinator = {
  /** Inicia sesion con credenciales y adopta la sesion resultante. */
  establish: (credentials: AuthCredentials) => Promise<AuthSession>;
  /** Renueva el access token. Colapsa las llamadas concurrentes en una sola. */
  renew: () => Promise<AuthSession>;
  getAccessToken: () => string | null;
  getRefreshDelay: () => number;
  end: () => void;
  dispose: () => void;
  subscribe: (listener: (session: AuthSession | null) => void) => () => void;
};

export const getAuthRefreshDelay = (
  accessTokenExpiresAt: string,
  now: number = Date.now(),
): number => {
  const expiration = Date.parse(accessTokenExpiresAt);

  if (Number.isNaN(expiration)) {
    return 0;
  }

  return Math.min(MAX_AUTH_REFRESH_DELAY_MS, Math.max(0, expiration - now - AUTH_REFRESH_SKEW_MS));
};

async function loadSessionProfile(auth: AuthAdapter, tokens: AuthTokens): Promise<AuthSession> {
  return { currentUser: await auth.loadCurrentUser(tokens.accessToken), tokens };
}

/**
 * Coordina la sesion dentro de una pestana y avisa a las demas.
 *
 * Tres problemas resueltos aqui, que antes estaban repartidos y sin cubrir:
 *
 * 1. **Single-flight.** Varias peticiones que caen con 401 a la vez comparten una
 *    sola renovacion. Sin esto, cada una rotaria por su cuenta usando el mismo
 *    refresh token y la segunda recibiria un 401 del backend. El backend ya no
 *    revoca la sesion ante reutilizacion, pero la pestana que pierde la carrera se
 *    quedaria sin sesion.
 *
 * 2. **Generacion (epoch).** Cada `end()` o `login` incrementa la generacion. Una
 *    renovacion que termina despues compara la generacion con la que tenia al
 *    salir y descarta su resultado si cambio. Eso mata las dos carreras que
 *    quedaban: un logout o un login durante un refresh en vuelo ya no pueden
 *    resucitar la sesion vieja ni pisar la nueva.
 *
 * 3. **Convergence entre pestanas.** Se avisa por `BroadcastChannel` cuando esta
 *    pestana abre o cierra sesion, para que las demas no se queden con una vista
 *    equivocada. La sesion en si no viaja por el canal: la cookie `HttpOnly` ya
 *    la comparte el navegador, y por ahi no puede leerla ni este codigo ni un
 *    atacante.
 */
export const createSessionCoordinator = (
  auth: AuthAdapter,
  dependencies: { bus?: CrossTabSessionBus } = {},
): SessionCoordinator => {
  const bus = dependencies.bus ?? createCrossTabSessionBus();

  let session: AuthSession | null = null;
  let generation = 0;
  let inFlight: Promise<AuthSession> | null = null;
  const listeners = new Set<(session: AuthSession | null) => void>();

  const announce = (next: AuthSession | null): void => {
    session = next;
    listeners.forEach((listener) => {
      try {
        listener(next);
      } catch {
        // Un suscriptor roto no puede impedir que los demas se enteren.
      }
    });
  };

  const unsubscribeBus = bus.subscribe((message: unknown) => {
    if (!isCrossTabMessage(message)) {
      return;
    }

    if (message.kind === "session-ended") {
      // Otra pestana confirmo el cierre. Limpiar la UI aunque un access JWT
      // stateless previamente emitido pueda seguir vigente hasta su expiracion.
      generation += 1;
      inFlight = null;
      announce(null);

      return;
    }

    if (message.kind === "session-established") {
      // Otra pestana inicio sesion. La cookie es compartida, asi que basta con
      // renovarla para adoptar esa sesion. La identidad anterior se descarta
      // primero para no mostrar sus datos si la nueva renovacion falla.
      generation += 1;
      inFlight = null;
      announce(null);
      void renew().catch(() => undefined);
    }

    // `session-renewed` no invalida nada: solo informa que la cookie cambio. Esta
    // pestana conserva su token hasta que el suyo caduque.
  });

  const renew = (): Promise<AuthSession> => {
    if (inFlight) {
      return inFlight;
    }

    const startedAt = generation;

    const attempt = (async (): Promise<AuthSession> => {
      try {
        const tokens = await auth.refresh();
        const next = await loadSessionProfile(auth, tokens);

        if (startedAt !== generation) {
          throw new SessionRenewalError(
            "La sesion cambio mientras se renovaba.",
            false,
            "rejected",
            true,
          );
        }

        announce(next);
        bus.publish({ kind: "session-renewed" });

        return next;
      } catch (error) {
        if (startedAt !== generation) {
          throw new SessionRenewalError(
            "La sesion cambio mientras se renovaba.",
            false,
            "rejected",
            true,
          );
        }
        if (error instanceof SessionRenewalError) {
          throw error;
        }

        const classified = toAuthError(error);

        throw new SessionRenewalError(
          "No se pudo renovar la sesion.",
          classified.failure !== "rejected",
          classified.failure,
        );
      }
    })();

    inFlight = attempt;
    const clearFlight = () => {
      if (inFlight === attempt) inFlight = null;
    };
    void attempt.then(clearFlight, clearFlight);

    return attempt;
  };

  return {
    async establish(credentials) {
      // La generacion avanza ANTES de pedir la sesion: si mientras el login esta
      // en vuelo una renovacion terminase, su resultado se descartaria en vez de
      // pisar la identidad recien creada.
      generation += 1;
      inFlight = null;
      const startedAt = generation;
      const tokens = await auth.login(credentials);
      const next = await loadSessionProfile(auth, tokens);

      if (startedAt !== generation) {
        throw new SessionRenewalError(
          "La sesion cambio durante el inicio de sesion.",
          false,
          "rejected",
          true,
        );
      }

      announce(next);
      bus.publish({ kind: "session-established" });

      return next;
    },
    renew,
    getAccessToken: () => session?.tokens.accessToken ?? null,
    getRefreshDelay: () =>
      session
        ? getAuthRefreshDelay(session.tokens.accessTokenExpiresAt)
        : MAX_AUTH_REFRESH_DELAY_MS,
    end() {
      // Invalida cualquier renovacion en vuelo antes de limpiar: si su respuesta
      // llegara despues, encontraria otra generacion y se descartaria.
      generation += 1;
      inFlight = null;
      announce(null);
      bus.publish({ kind: "session-ended" });
    },
    dispose() {
      unsubscribeBus();
      bus.close();
    },
    subscribe(listener) {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },
  };
};

/**
 * Apertura de sesion con credenciales. El refresh token lo fija el backend en una
 * cookie `HttpOnly` durante el login, asi que no hay nada que guardar aqui: solo
 * el access token, que vive en memoria.
 */
export async function createAuthSession(
  auth: AuthAdapter,
  credentials: AuthCredentials,
): Promise<AuthSession> {
  const tokens = await auth.login(credentials);

  try {
    return await loadSessionProfile(auth, tokens);
  } catch (error) {
    // El login ya fijo la cookie. Sin perfil no hay sesion utilizable, asi que se
    // cierra: de lo contrario el proximo arranque se encuentra una sesion a medias
    // y el usuario cree que esta dentro.
    await auth.logout().catch(() => undefined);
    throw error;
  }
}
