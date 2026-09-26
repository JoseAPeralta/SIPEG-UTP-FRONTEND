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
      environment: { DEV: false, PROD: true, VITE_API_BASE_URL: "https://api.test" },
      fetcher,
    });

    expect(fetcher.mock.calls[0]?.[0]).toBe("https://api.test/events");
    expect(
      new Headers((fetcher.mock.calls[0]?.[1] as RequestInit | undefined)?.headers).get("Accept"),
    ).toBe("application/json");
    expect(response).toEqual({ ok: true });
  });

  it("should preserve custom request headers", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      }),
    );

    await apiRequest("/events", {
      environment: { DEV: false, PROD: true, VITE_API_BASE_URL: "https://api.test" },
      fetcher,
      requestInit: { headers: new Headers({ Authorization: "Bearer token" }) },
    });

    const requestInit = fetcher.mock.calls[0]?.[1] as RequestInit | undefined;
    const headers = new Headers(requestInit?.headers);

    expect(headers.get("Accept")).toBe("application/json");
    expect(headers.get("Authorization")).toBe("Bearer token");
  });

  it("should throw a Spanish error when the response is not ok", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response("Server error", { status: 500 }));

    await expect(
      apiRequest("/events", {
        environment: { DEV: false, PROD: true, VITE_API_BASE_URL: "https://api.test" },
        fetcher,
      }),
    ).rejects.toMatchObject({
      message: "Ocurrio un error en el servidor. Intenta de nuevo.",
      name: "ApiError",
      status: 500,
    });
  });

  it("should map known status codes to Spanish messages without exposing the path", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(null, { status: 404 }));

    await expect(
      apiRequest("/api/v1/activities/missing", {
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
        environment: { DEV: false, PROD: true, VITE_API_BASE_URL: "https://api.test" },
        fetcher,
      }),
    ).rejects.toMatchObject({
      message: "No se pudo conectar con el servidor. Verifica que el backend este disponible.",
      status: 0,
    });
  });
});
