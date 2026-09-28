import { describe, expect, it, vi } from "vitest";

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
});
