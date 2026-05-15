import { describe, expect, it, vi } from "vitest";

import { apiRequest, resolveApiBaseUrl } from "@/services/apiClient";

describe("apiClient", () => {
  it("should prefer an explicit VITE_API_BASE_URL", () => {
    expect(
      resolveApiBaseUrl({ DEV: true, PROD: false, VITE_API_BASE_URL: "https://api.utp.ac.pa/v1/" }),
    ).toBe("https://api.utp.ac.pa/v1");
  });

  it("should use the local API URL in development", () => {
    expect(resolveApiBaseUrl({ DEV: true, PROD: false })).toBe("http://localhost:3000/api");
  });

  it("should use the relative API URL in production", () => {
    expect(resolveApiBaseUrl({ DEV: false, PROD: true })).toBe("/api");
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

  it("should throw a readable error when the response is not ok", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response("Server error", { status: 500 }));

    await expect(
      apiRequest("/events", {
        environment: { DEV: false, PROD: true, VITE_API_BASE_URL: "https://api.test" },
        fetcher,
      }),
    ).rejects.toThrow("No se pudo completar la solicitud a /events");
  });
});
