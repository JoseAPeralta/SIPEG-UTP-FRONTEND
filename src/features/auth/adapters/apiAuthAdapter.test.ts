import { describe, expect, it, vi } from "vitest";

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
  refreshToken: "refresh-token",
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
  if (typeof request.body !== "string") {
    throw new Error("Expected a JSON string request body");
  }

  return JSON.parse(request.body) as unknown;
}

describe("createApiAuthAdapter", () => {
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
    expect(readJsonBody(request)).toEqual({
      email: "admin@example.edu",
      password: "secret",
    });
  });

  it("should rotate the refresh token", async () => {
    const fetcher = vi.fn().mockResolvedValue(jsonResponse(tokens));
    const adapter = createApiAuthAdapter({ environment, fetcher });

    await expect(adapter.refresh("old-refresh-token")).resolves.toEqual(tokens);

    const request = fetcher.mock.calls[0]?.[1] as RequestInit;
    expect(fetcher.mock.calls[0]?.[0]).toBe("https://api.test/api/v1/auth/refresh");
    expect(readJsonBody(request)).toEqual({ refreshToken: "old-refresh-token" });
  });

  it("should load the authenticated profile with a bearer token", async () => {
    const fetcher = vi.fn().mockResolvedValue(jsonResponse(profile));
    const adapter = createApiAuthAdapter({ environment, fetcher });

    await expect(adapter.loadCurrentUser("access-token")).resolves.toEqual(profile);

    const request = fetcher.mock.calls[0]?.[1] as RequestInit;
    expect(fetcher.mock.calls[0]?.[0]).toBe("https://api.test/api/v1/users/me");
    expect(new Headers(request.headers).get("Authorization")).toBe("Bearer access-token");
  });

  it("should revoke the refresh token during logout", async () => {
    const fetcher = vi.fn().mockResolvedValue(jsonResponse({}));
    const adapter = createApiAuthAdapter({ environment, fetcher });

    await expect(adapter.logout("refresh-token")).resolves.toBeUndefined();

    const request = fetcher.mock.calls[0]?.[1] as RequestInit;
    expect(fetcher.mock.calls[0]?.[0]).toBe("https://api.test/api/v1/auth/logout");
    expect(readJsonBody(request)).toEqual({ refreshToken: "refresh-token" });
  });

  it("should verify an email with the contracted request body", async () => {
    const fetcher = vi.fn().mockResolvedValue(jsonResponse({}));
    const adapter = createApiAuthAdapter({ environment, fetcher });

    await expect(adapter.verifyEmail("verify-token")).resolves.toBeUndefined();

    const request = fetcher.mock.calls[0]?.[1] as RequestInit;
    expect(fetcher.mock.calls[0]?.[0]).toBe("https://api.test/api/v1/auth/verify-email");
    expect(new Headers(request.headers).get("Content-Type")).toBe("application/json");
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
        refreshToken: "refresh-token",
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
      refreshToken: "refresh-token",
    });
  });

  it("should reject a password change response that leaks data", async () => {
    const fetcher = vi.fn().mockResolvedValue(jsonResponse({ sessionsRevoked: 2 }));
    const adapter = createApiAuthAdapter({ environment, fetcher });

    await expect(
      adapter.changePassword("access-token", {
        currentPassword: "sipeg-demo",
        newPassword: "Nueva clave 2026",
        refreshToken: "refresh-token",
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
