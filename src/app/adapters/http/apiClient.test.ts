import { describe, expect, it, vi } from "vitest";

import { apiRequest, resolveApiBaseUrl } from "./apiClient";

describe("apiClient", () => {
  it("should prefer an explicit VITE_API_BASE_URL", () => {
    expect(
      resolveApiBaseUrl({ DEV: true, PROD: false, VITE_API_BASE_URL: "https://api.utp.ac.pa/v1/" }),
    ).toBe("https://api.utp.ac.pa/v1");
  });

  it("should use the local API URL in development", () => {
    expect(resolveApiBaseUrl({ DEV: true, PROD: false })).toBe("http://localhost:3000");
  });

  it("should require an explicit API URL in production", () => {
    expect(() => resolveApiBaseUrl({ DEV: false, PROD: true })).toThrow(
      "VITE_API_BASE_URL es obligatoria en produccion",
    );
  });

  it("should request JSON from the resolved API URL", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      }),
    );

    const response = await apiRequest<{ ok: boolean }>("/events", {
      auth: { mode: "none" },
      environment: { DEV: false, PROD: true, VITE_API_BASE_URL: "https://api.test" },
      fetcher,
    });

    expect(fetcher.mock.calls[0]?.[0]).toBe("https://api.test/events");
    expect(
      new Headers((fetcher.mock.calls[0]?.[1] as RequestInit | undefined)?.headers).get("Accept"),
    ).toBe("application/json");
    expect(response).toEqual({ ok: true });
  });

  it("should reject a manually supplied Authorization header before fetch", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      }),
    );

    await expect(
      apiRequest("/events", {
        auth: { mode: "none" },
        environment: { DEV: false, PROD: true, VITE_API_BASE_URL: "https://api.test" },
        fetcher,
        requestInit: { headers: new Headers({ Authorization: "Bearer token" }) },
      }),
    ).rejects.toThrow("Authorization");
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("should attach the bearer token provided by the session", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      }),
    );

    await apiRequest("/api/v1/users/me", {
      auth: { accessToken: "access-token", mode: "bearer" },
      environment: { DEV: false, PROD: true, VITE_API_BASE_URL: "https://api.test" },
      fetcher,
    });

    const requestInit = fetcher.mock.calls[0]?.[1] as RequestInit | undefined;

    expect(new Headers(requestInit?.headers).get("Authorization")).toBe("Bearer access-token");
  });

  it.each([null, undefined, "", "   "])(
    "should reject a missing bearer token before fetch (%s)",
    async (accessToken) => {
      const fetcher = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ ok: true }), {
          headers: { "Content-Type": "application/json" },
          status: 200,
        }),
      );

      await expect(
        apiRequest("/api/v1/organizational-units", {
          auth: { accessToken, mode: "bearer" },
          environment: { DEV: false, PROD: true, VITE_API_BASE_URL: "https://api.test" },
          fetcher,
        }),
      ).rejects.toMatchObject({
        message: "Su sesion no esta autorizada.",
        name: "ApiError",
        status: 401,
      });
      expect(fetcher).not.toHaveBeenCalled();
    },
  );

  it("should throw a Spanish error when the response is not ok", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response("Server error", { status: 500 }));

    await expect(
      apiRequest("/events", {
        auth: { mode: "none" },
        environment: { DEV: false, PROD: true, VITE_API_BASE_URL: "https://api.test" },
        fetcher,
      }),
    ).rejects.toMatchObject({
      message: "Ocurrio un error en el servidor. Intente de nuevo.",
      name: "ApiError",
      status: 500,
    });
  });

  it("should map known status codes to Spanish messages without exposing the path", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(null, { status: 404 }));

    await expect(
      apiRequest("/api/v1/activities/missing", {
        auth: { mode: "none" },
        environment: { DEV: false, PROD: true, VITE_API_BASE_URL: "https://api.test" },
        fetcher,
      }),
    ).rejects.toMatchObject({
      message: "No se encontro el recurso solicitado.",
      status: 404,
    });
  });

  it("should report a Spanish connection error when the request fails", async () => {
    const fetcher = vi.fn().mockRejectedValue(new TypeError("fetch failed"));

    await expect(
      apiRequest("/api/v1/activities", {
        auth: { mode: "none" },
        environment: { DEV: false, PROD: true, VITE_API_BASE_URL: "https://api.test" },
        fetcher,
      }),
    ).rejects.toMatchObject({
      message: "No se pudo conectar con el servidor. Verifique que el backend este disponible.",
      status: 0,
    });
  });
});
