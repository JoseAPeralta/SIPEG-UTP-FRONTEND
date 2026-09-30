import { describe, expect, it, vi } from "vitest";

import type { AuthAdapter } from "@/app/adapters";
import { AuthError } from "../adapters/authFailure";
import type { AuthenticatedUser, AuthTokens } from "@/types/domain";

import {
  createAuthSession,
  createSessionCoordinator,
  getAuthRefreshDelay,
  MAX_AUTH_REFRESH_DELAY_MS,
  type SessionCoordinator,
} from "./authSession";
import type { CrossTabMessage, CrossTabSessionBus } from "./crossTabSession";

const tokens: AuthTokens = {
  accessToken: "access-token",
  accessTokenExpiresAt: "2026-09-26T12:00:00.000Z",
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
    changePassword: vi.fn().mockResolvedValue(undefined),
    loadCurrentUser: vi.fn().mockResolvedValue(currentUser),
    login: vi.fn().mockResolvedValue(tokens),
    logout: vi.fn().mockResolvedValue(undefined),
    refresh: vi.fn().mockResolvedValue(tokens),
    requestPasswordReset: vi.fn().mockResolvedValue(undefined),
    resetPassword: vi.fn().mockResolvedValue(undefined),
    updateCurrentUser: vi.fn(),
    verifyEmail: vi.fn().mockResolvedValue(undefined),
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

  it("should revoke the session when profile loading fails after login", async () => {
    const profileError = new Error("profile unavailable");
    const adapter = createAuthAdapter({
      loadCurrentUser: vi.fn().mockRejectedValue(profileError),
    });

    await expect(
      createAuthSession(adapter, { email: "admin@example.edu", password: "secret" }),
    ).rejects.toBe(profileError);
    // Sin perfil no hay sesion utilizable, pero la cookie ya esta fijada: si no
    // se cierra, el proximo arranque se encontraria con una sesion a medias.
    expect(adapter.logout).toHaveBeenCalled();
  });
});

/** Adaptador con refresh ya renovado: el token devuelto es distinto al inicial. */
const renewedTokens: AuthTokens = { ...tokens, accessToken: "access-2" };

/** Bus de pruebas que deja delivering mensajes a mano. */
function buildBus(): {
  bus: CrossTabSessionBus;
  listeners: ((message: CrossTabMessage) => void)[];
} {
  const listeners: ((message: CrossTabMessage) => void)[] = [];

  return {
    listeners,
    bus: {
      publish: vi.fn(),
      subscribe: vi.fn((listener: (message: CrossTabMessage) => void) => {
        listeners.push(listener);

        return () => undefined;
      }),
      deliver: vi.fn(),
      close: vi.fn(),
    },
  };
}

const buildAdapter = (overrides: Partial<AuthAdapter> = {}): AuthAdapter =>
  createAuthAdapter({ refresh: vi.fn().mockResolvedValue(renewedTokens), ...overrides });

describe("createSessionCoordinator", () => {
  it("reports the current access token to the HTTP client", async () => {
    const auth = buildAdapter();
    const coordinator = createSessionCoordinator(auth);

    await coordinator.renew();

    expect(coordinator.getAccessToken()).toBe("access-2");
  });

  it("collapses concurrent renewals into a single backend call", async () => {
    const auth = buildAdapter();
    const coordinator = createSessionCoordinator(auth);

    // Tres peticiones de negocio caen a la vez con un 401 cada una. Si cada una
    // rotara por su cuenta, dos usarian el mismo refresh token y una receberia
    // 401 del backend.
    await Promise.all([coordinator.renew(), coordinator.renew(), coordinator.renew()]);

    expect(auth.refresh).toHaveBeenCalledTimes(1);
  });

  it("rejects with a transient flag on 429, so the session is not destroyed", async () => {
    const auth = buildAdapter();
    (auth.refresh as ReturnType<typeof vi.fn>).mockRejectedValue(
      Object.assign(new Error("throttled"), { status: 429 }),
    );
    const coordinator = createSessionCoordinator(auth);

    // Un 429 es cuota agotada, no sesion terminada: cerrar la sesion aqui
    // expulsaria al usuario por algo que se resuelve solo en un minuto.
    await expect(coordinator.renew()).rejects.toMatchObject({ transient: true });
    expect(auth.logout).not.toHaveBeenCalled();
  });

  it("rejects with a transient flag on a network failure", async () => {
    const auth = buildAdapter();
    (auth.refresh as ReturnType<typeof vi.fn>).mockRejectedValue(
      Object.assign(new Error("offline"), { status: 0 }),
    );
    const coordinator = createSessionCoordinator(auth);

    await expect(coordinator.renew()).rejects.toMatchObject({ transient: true });
  });

  it("rejects with a terminal flag on 401, so the session really ended", async () => {
    const auth = buildAdapter();
    (auth.refresh as ReturnType<typeof vi.fn>).mockRejectedValue(new AuthError("rejected"));
    const coordinator = createSessionCoordinator(auth);

    await expect(coordinator.renew()).rejects.toMatchObject({ transient: false });
  });

  it("invalidates a renewal that belongs to a previous identity", async () => {
    const auth = buildAdapter();
    let releaseRefresh: (() => void) | undefined;
    const pending = new Promise<AuthTokens>((resolve) => {
      releaseRefresh = () => resolve(renewedTokens);
    });
    (auth.refresh as ReturnType<typeof vi.fn>).mockReturnValue(pending);
    const coordinator = createSessionCoordinator(auth);
    const inFlight = coordinator.renew();

    // El usuario cierra sesion mientras la renovacion esta en vuelo. Al llegar la
    // respuesta, pertenece a una identidad que ya no existe: aplicarla dejaria al
    // usuario "autenticado" despues de haber cerrado sesion.
    coordinator.end();
    releaseRefresh?.();

    await expect(inFlight).rejects.toMatchObject({ transient: false });
    expect(coordinator.getAccessToken()).toBeNull();
  });

  it("allows a new renewal after the session ended", async () => {
    const auth = buildAdapter();
    const coordinator = createSessionCoordinator(auth);
    coordinator.end();

    await coordinator.renew();

    expect(coordinator.getAccessToken()).toBe("access-2");
  });

  it("signals other tabs on renew and on end", async () => {
    const auth = buildAdapter();
    const { bus } = buildBus();
    const coordinator: SessionCoordinator = createSessionCoordinator(auth, { bus });

    await coordinator.renew();
    coordinator.end();

    expect(bus.publish).toHaveBeenCalledWith({ kind: "session-renewed" });
    expect(bus.publish).toHaveBeenCalledWith({ kind: "session-ended" });
  });

  it("lets a foreign tab end the local session", async () => {
    const auth = buildAdapter();
    const { bus, listeners } = buildBus();
    const coordinator = createSessionCoordinator(auth, { bus });
    await coordinator.renew();

    // Otra pestana cerro sesion: la cookie ya no vale, asi que esta tambien.
    listeners.forEach((listener) => listener({ kind: "session-ended" }));

    expect(coordinator.getAccessToken()).toBeNull();
  });

  it("ignores malformed foreign messages", async () => {
    const auth = buildAdapter();
    const { bus, listeners } = buildBus();
    const coordinator = createSessionCoordinator(auth, { bus });
    await coordinator.renew();

    expect(() => {
      listeners.forEach((listener) =>
        listener({ kind: "inventado" } as unknown as CrossTabMessage),
      );
      listeners.forEach((listener) => listener(undefined as unknown as CrossTabMessage));
    }).not.toThrow();
    expect(coordinator.getAccessToken()).toBe("access-2");
  });

  it("does not clear the session when another tab merely renewed", async () => {
    const auth = buildAdapter();
    const { bus, listeners } = buildBus();
    const coordinator = createSessionCoordinator(auth, { bus });
    await coordinator.renew();

    listeners.forEach((listener) => listener({ kind: "session-renewed" }));

    // Una renovacion ajena no invalida esta sesion: solo informa que la cookie
    // cambio. Esta conserva su token hasta que el suyo caduque.
    expect(coordinator.getAccessToken()).toBe("access-2");
  });
});
