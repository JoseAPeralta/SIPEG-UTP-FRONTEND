import { describe, expect, it, vi } from "vitest";

import { ApiError, apiRequest, type ApiRequestOptions } from "./apiClient.js";

const ENVIRONMENT = { DEV: true, PROD: false, VITE_API_BASE_URL: "http://api.test" } as const;

type Call = {
  url: string;
  init: RequestInit;
};

const buildFetch = (
  handler: (call: Call, index: number) => Response,
): { fetcher: typeof fetch; calls: Call[] } => {
  const calls: Call[] = [];
  // `fetch` admite string, URL o Request. Aqui solo llega un string, asi que se
  // anotan los tipos reales del override en vez de castear a `typeof fetch`.
  const fetcher = vi.fn((url: string, init?: RequestInit): Promise<Response> => {
    const call = { url, init: init ?? {} };
    calls.push(call);

    return Promise.resolve(handler(call, calls.length - 1));
  }) as unknown as typeof fetch;

  return { fetcher, calls };
};

const jsonResponse = (status: number, body: unknown = {}): Response =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const baseOptions = (fetcher: typeof fetch): ApiRequestOptions => ({
  environment: ENVIRONMENT,
  fetcher,
  auth: { mode: "bearer", accessToken: "access-1" },
});

describe("apiRequest credentials", () => {
  it("sends the session cookie with every request", async () => {
    const { fetcher, calls } = buildFetch(() => jsonResponse(200, { ok: true }));

    await apiRequest("/api/v1/careers", baseOptions(fetcher));

    expect(calls[0]?.init.credentials).toBe("include");
  });

  it("does not set an Authorization header for unauthenticated calls", async () => {
    const { fetcher, calls } = buildFetch(() => jsonResponse(200, { ok: true }));

    await apiRequest("/api/v1/auth/login", {
      ...baseOptions(fetcher),
      auth: { mode: "none" },
    });

    expect(new Headers(calls[0]?.init.headers).has("Authorization")).toBe(false);
  });
});

describe("apiRequest 401 handling", () => {
  it("refreshes once and replays the original request", async () => {
    // La primera llamada falla con 401 por token viejo; tras el refresh, la misma
    // peticion se reenvia y funciona.
    const { fetcher, calls } = buildFetch((_call, index) =>
      index === 0 ? jsonResponse(401) : jsonResponse(200, { items: [] }),
    );
    const refresh = vi.fn(() => Promise.resolve({ getAccessToken: () => "access-2" }));

    const result = await apiRequest<{ items: unknown[] }>("/api/v1/careers", {
      ...baseOptions(fetcher),
      sessionRefresh: refresh,
    });

    expect(refresh).toHaveBeenCalledTimes(1);
    expect(calls).toHaveLength(2);
    expect(calls[1]?.url).toBe("http://api.test/api/v1/careers");
    expect(new Headers(calls[1]?.init.headers).get("Authorization")).toBe("Bearer access-2");
    expect(result).toEqual({ items: [] });
  });

  it("does not loop: a second 401 is surfaced to the caller", async () => {
    // Sin este tope, un backend que devuelve 401 de forma permanente entraria en
    // un ciclo infinito de refresh.
    const { fetcher, calls } = buildFetch(() => jsonResponse(401));
    const refresh = vi.fn(() => Promise.resolve({ getAccessToken: () => "access-2" }));

    await expect(
      apiRequest("/api/v1/careers", { ...baseOptions(fetcher), sessionRefresh: refresh }),
    ).rejects.toBeInstanceOf(ApiError);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(calls).toHaveLength(2);
  });

  it("does not try to refresh when the failing call is the refresh itself", async () => {
    const { fetcher, calls } = buildFetch(() => jsonResponse(401));
    const refresh = vi.fn(() => Promise.resolve({ getAccessToken: () => "access-2" }));

    await expect(
      apiRequest("/api/v1/auth/refresh", {
        ...baseOptions(fetcher),
        auth: { mode: "none" },
        sessionRefresh: refresh,
      }),
    ).rejects.toBeInstanceOf(ApiError);
    expect(refresh).not.toHaveBeenCalled();
    expect(calls).toHaveLength(1);
  });

  it("does not try to refresh a request that was never authenticated", async () => {
    const { fetcher } = buildFetch(() => jsonResponse(401));
    const refresh = vi.fn(() => Promise.resolve({ getAccessToken: () => "access-2" }));

    await expect(
      apiRequest("/api/v1/careers", {
        environment: ENVIRONMENT,
        fetcher,
        auth: { mode: "none" },
        sessionRefresh: refresh,
      }),
    ).rejects.toBeInstanceOf(ApiError);
    expect(refresh).not.toHaveBeenCalled();
  });

  it("surfaces the original 401 when the refresh itself fails", async () => {
    // Si el refresh falla, la peticion original no tiene sentido: lo que el
    // usuario necesita saber es que su sesion termino, no el error de red.
    const { fetcher } = buildFetch(() => jsonResponse(401));
    const refresh = vi.fn(() => Promise.reject(new Error("refresh rejected")));

    await expect(
      apiRequest("/api/v1/careers", { ...baseOptions(fetcher), sessionRefresh: refresh }),
    ).rejects.toMatchObject({ status: 401 });
  });
});
