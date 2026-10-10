import { afterEach, describe, expect, it, vi } from "vitest";

import type { ProfileUpdateRequest } from "@/app/adapters/contracts";

import { createApiAuthAdapter } from "./apiAuthAdapter";

const environment = {
  DEV: false,
  PROD: true,
  VITE_API_BASE_URL: "https://api.test",
} as const;

const tokens = {
  accessToken: "access-token",
  accessTokenExpiresAt: "2026-09-26T12:00:00.000Z",
  refreshTokenExpiresAt: "2026-10-03T12:00:00.000Z",
  tokenType: "Bearer",
};

const profile = {
  career: null,
  email: "admin@example.edu",
  firstName: "Mariana",
  globalRole: "ADMIN",
  id: "user-1",
  identificationNumber: "8-123-456",
  lastName: "Rodriguez",
  unit: { code: "FISC", id: "unit-1", name: "Facultad de Sistemas" },
};

function jsonResponse(data: unknown) {
  return new Response(JSON.stringify({ data, message: "ok", success: true }), {
    headers: { "Content-Type": "application/json" },
    status: 200,
  });
}

function readJsonBody(request: RequestInit): unknown {
  // `undefined` es valido: login, refresh y logout ya no envian cuerpo porque la
  // sesion viaja en la cookie HttpOnly.
  if (request.body === undefined) {
    return undefined;
  }

  if (typeof request.body !== "string") {
    throw new Error("Expected a JSON string request body");
  }

  return JSON.parse(request.body) as unknown;
}

describe("createApiAuthAdapter", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("serializes cookie mutations from independent adapters until the response is consumed", async () => {
    let queue = Promise.resolve();
    const request = vi.fn((_name: string, run: () => Promise<unknown>) => {
      const result = queue.then(run);
      queue = result.then(
        () => undefined,
        () => undefined,
      );
      return result;
    });
    vi.stubGlobal("navigator", { locks: { request } });
    let release!: (response: Response) => void;
    const fetcher = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<Response>((resolve) => {
            release = resolve;
          }),
      )
      .mockResolvedValueOnce(jsonResponse({}));
    const first = createApiAuthAdapter({ environment, fetcher });
    const second = createApiAuthAdapter({ environment, fetcher });
    const refresh = first.refresh();
    const logout = second.logout();
    await vi.waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));
    expect(request).toHaveBeenCalledTimes(2);
    release(jsonResponse(tokens));
    await Promise.all([refresh, logout]);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(request.mock.calls[0]?.[0]).toBe(request.mock.calls[1]?.[0]);
  });

  it("retries a conflicting refresh only once when Web Locks are unavailable", async () => {
    vi.stubGlobal("navigator", {});
    const fetcher = vi.fn().mockResolvedValue(new Response(null, { status: 401 }));
    const adapter = createApiAuthAdapter({ environment, fetcher });
    await expect(adapter.refresh()).rejects.toMatchObject({ status: 401 });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("should log in with the contracted request body", async () => {
    const fetcher = vi.fn().mockResolvedValue(jsonResponse(tokens));
    const adapter = createApiAuthAdapter({ environment, fetcher });

    await expect(
      adapter.login({ email: "admin@example.edu", password: "secret" }),
    ).resolves.toEqual(tokens);

    expect(fetcher).toHaveBeenCalledWith(
      "https://api.test/api/v1/auth/login",
      expect.objectContaining({ method: "POST" }),
    );
    const request = fetcher.mock.calls[0]?.[1] as RequestInit;
    expect(new Headers(request.headers).get("Content-Type")).toBe("application/json");
    // El login debe poder recibir la cookie HttpOnly que fija el backend.
    expect(request.credentials).toBe("include");
    expect(readJsonBody(request)).toEqual({
      email: "admin@example.edu",
      password: "secret",
    });
  });

  it("should renew the session without sending a body", async () => {
    const fetcher = vi.fn().mockResolvedValue(jsonResponse(tokens));
    const adapter = createApiAuthAdapter({ environment, fetcher });

    await expect(adapter.refresh()).resolves.toEqual(tokens);

    const request = fetcher.mock.calls[0]?.[1] as RequestInit;
    expect(fetcher.mock.calls[0]?.[0]).toBe("https://api.test/api/v1/auth/refresh");
    // Sin cuerpo y con `credentials: include`: la cookie HttpOnly es lo unico que
    // identifica la sesion, y solo se envia si el navegador la adjunta.
    expect(readJsonBody(request)).toBeUndefined();
    expect(request.method).toBe("POST");
    expect(request.credentials).toBe("include");
    expect(new Headers(request.headers).has("Content-Type")).toBe(false);
  });

  it("should load the authenticated profile with a bearer token", async () => {
    const fetcher = vi.fn().mockResolvedValue(jsonResponse(profile));
    const adapter = createApiAuthAdapter({ environment, fetcher });

    await expect(adapter.loadCurrentUser("access-token")).resolves.toEqual(profile);

    const request = fetcher.mock.calls[0]?.[1] as RequestInit;
    expect(fetcher.mock.calls[0]?.[0]).toBe("https://api.test/api/v1/users/me");
    expect(new Headers(request.headers).get("Authorization")).toBe("Bearer access-token");
  });

  it("should close the session during logout without sending a body", async () => {
    const fetcher = vi.fn().mockResolvedValue(jsonResponse({}));
    const adapter = createApiAuthAdapter({ environment, fetcher });

    await expect(adapter.logout()).resolves.toBeUndefined();

    const request = fetcher.mock.calls[0]?.[1] as RequestInit;
    expect(fetcher.mock.calls[0]?.[0]).toBe("https://api.test/api/v1/auth/logout");
    // Sin cuerpo y con `credentials: include`: la cookie identifica la sesion y la
    // respuesta la borra.
    expect(request.body).toBeUndefined();
    expect(request.method).toBe("POST");
    expect(request.credentials).toBe("include");
  });

  it("should verify an email with the contracted request body", async () => {
    const fetcher = vi.fn().mockResolvedValue(jsonResponse({}));
    const adapter = createApiAuthAdapter({ environment, fetcher });

    await expect(adapter.verifyEmail("verify-token")).resolves.toBeUndefined();

    const request = fetcher.mock.calls[0]?.[1] as RequestInit;
    expect(fetcher.mock.calls[0]?.[0]).toBe("https://api.test/api/v1/auth/verify-email");
    expect(new Headers(request.headers).get("Content-Type")).toBe("application/json");
    // Verificar el correo no depende de la cookie de sesion.
    expect(request.credentials).toBe("omit");
    expect(readJsonBody(request)).toEqual({ token: "verify-token" });
  });

  it("should request a password reset without sending credentials", async () => {
    const fetcher = vi.fn().mockResolvedValue(jsonResponse({}));
    const adapter = createApiAuthAdapter({ environment, fetcher });

    await expect(
      adapter.requestPasswordReset({ email: "admin@example.edu" }),
    ).resolves.toBeUndefined();

    const request = fetcher.mock.calls[0]?.[1] as RequestInit;
    expect(fetcher.mock.calls[0]?.[0]).toBe("https://api.test/api/v1/auth/forgot-password");
    expect(new Headers(request.headers).get("Authorization")).toBeNull();
    expect(new Headers(request.headers).get("Content-Type")).toBe("application/json");
    expect(request.credentials).toBe("omit");
    expect(readJsonBody(request)).toEqual({ email: "admin@example.edu" });
  });

  it("should reset a password with the contracted request body", async () => {
    const fetcher = vi.fn().mockResolvedValue(jsonResponse({}));
    const adapter = createApiAuthAdapter({ environment, fetcher });

    await expect(
      adapter.resetPassword({ newPassword: "Nueva clave 2026", token: "reset-token" }),
    ).resolves.toBeUndefined();

    const request = fetcher.mock.calls[0]?.[1] as RequestInit;
    expect(fetcher.mock.calls[0]?.[0]).toBe("https://api.test/api/v1/auth/reset-password");
    expect(new Headers(request.headers).get("Authorization")).toBeNull();
    expect(request.credentials).toBe("omit");
    expect(readJsonBody(request)).toEqual({
      newPassword: "Nueva clave 2026",
      token: "reset-token",
    });
  });

  it("should reject a password reset response that leaks data", async () => {
    const fetcher = vi.fn().mockResolvedValue(jsonResponse({ resetToken: "leaked" }));
    const adapter = createApiAuthAdapter({ environment, fetcher });

    await expect(adapter.requestPasswordReset({ email: "admin@example.edu" })).rejects.toThrow(
      /auth\.forgotPassword\.data/,
    );
  });

  it("should change the password with the bearer credential and the contracted body", async () => {
    const fetcher = vi.fn().mockResolvedValue(jsonResponse({}));
    const adapter = createApiAuthAdapter({ environment, fetcher });

    await expect(
      adapter.changePassword("access-token", {
        currentPassword: "sipeg-demo",
        newPassword: "Nueva clave 2026",
      }),
    ).resolves.toBeUndefined();

    const request = fetcher.mock.calls[0]?.[1] as RequestInit;
    expect(fetcher.mock.calls[0]?.[0]).toBe("https://api.test/api/v1/auth/change-password");
    expect(request.method).toBe("POST");
    expect(new Headers(request.headers).get("Authorization")).toBe("Bearer access-token");
    expect(new Headers(request.headers).get("Content-Type")).toBe("application/json");
    expect(readJsonBody(request)).toEqual({
      currentPassword: "sipeg-demo",
      newPassword: "Nueva clave 2026",
    });
  });

  it("should reject a password change that carries a refresh token in the body", async () => {
    // El backend lo toma de la cookie. Si el cliente lo enviara, estaria
    // expadiendo la credencial a JavaScript sin necesidad.
    const fetcher = vi.fn().mockResolvedValue(jsonResponse({}));
    const adapter = createApiAuthAdapter({ environment, fetcher });

    await adapter
      .changePassword("access-token", {
        currentPassword: "sipeg-demo",
        newPassword: "Nueva clave 2026",
      })
      .catch(() => undefined);

    const request = fetcher.mock.calls[0]?.[1] as RequestInit;
    expect(JSON.stringify(request.body)).not.toContain("refreshToken");
  });

  it("should reject a password change response that leaks data", async () => {
    const fetcher = vi.fn().mockResolvedValue(jsonResponse({ sessionsRevoked: 2 }));
    const adapter = createApiAuthAdapter({ environment, fetcher });

    await expect(
      adapter.changePassword("access-token", {
        currentPassword: "sipeg-demo",
        newPassword: "Nueva clave 2026",
      }),
    ).rejects.toThrow(/auth\.changePassword\.data/);
  });

  it("should update the profile with the bearer credential and the contracted body", async () => {
    const fetcher = vi.fn().mockResolvedValue(jsonResponse(profile));
    const adapter = createApiAuthAdapter({ environment, fetcher });

    await expect(
      adapter.updateCurrentUser("access-token", { firstName: "Mariana", unitId: "unit-1" }),
    ).resolves.toEqual(profile);

    const request = fetcher.mock.calls[0]?.[1] as RequestInit;
    expect(fetcher.mock.calls[0]?.[0]).toBe("https://api.test/api/v1/users/me");
    expect(request.method).toBe("PATCH");
    expect(new Headers(request.headers).get("Authorization")).toBe("Bearer access-token");
    expect(new Headers(request.headers).get("Content-Type")).toBe("application/json");
    expect(readJsonBody(request)).toEqual({ firstName: "Mariana", unitId: "unit-1" });
  });

  it("should send the Otro option as an explicit null unit", async () => {
    const fetcher = vi.fn().mockResolvedValue(jsonResponse(profile));
    const adapter = createApiAuthAdapter({ environment, fetcher });

    await adapter.updateCurrentUser("access-token", { firstName: "Mariana", unitId: null });

    expect(readJsonBody(fetcher.mock.calls[0]?.[1] as RequestInit)).toEqual({
      firstName: "Mariana",
      unitId: null,
    });
  });

  it("should omit undefined properties instead of sending nulls", async () => {
    const fetcher = vi.fn().mockResolvedValue(jsonResponse(profile));
    const adapter = createApiAuthAdapter({ environment, fetcher });
    const requestWithUndefined = {
      careerId: undefined,
      firstName: "Mariana",
      lastName: undefined,
      unitId: undefined,
    } as unknown as ProfileUpdateRequest;

    await adapter.updateCurrentUser("access-token", requestWithUndefined);

    expect(readJsonBody(fetcher.mock.calls[0]?.[1] as RequestInit)).toEqual({
      firstName: "Mariana",
    });
  });

  it("should never forward server-controlled fields injected at runtime", async () => {
    const fetcher = vi.fn().mockResolvedValue(jsonResponse(profile));
    const adapter = createApiAuthAdapter({ environment, fetcher });

    await adapter.updateCurrentUser("access-token", {
      email: "attacker@example.com",
      firstName: "Mariana",
      globalRole: "ADMIN",
      id: "user-2",
      identificationNumber: "8-999-9999",
      isActive: false,
    } as ProfileUpdateRequest);

    expect(readJsonBody(fetcher.mock.calls[0]?.[1] as RequestInit)).toEqual({
      firstName: "Mariana",
    });
  });

  it("should reject a profile update response that is not a contracted profile", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(jsonResponse({ ...profile, globalRole: "SUPERADMIN" }));
    const adapter = createApiAuthAdapter({ environment, fetcher });

    await expect(
      adapter.updateCurrentUser("access-token", { firstName: "Mariana" }),
    ).rejects.toThrow(/users\.me\.data\.globalRole/);
  });
});
