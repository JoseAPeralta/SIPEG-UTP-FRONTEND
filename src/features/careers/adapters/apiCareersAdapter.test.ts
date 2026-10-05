// @vitest-environment node

import { describe, expect, it, vi } from "vitest";

import { createApiCareersAdapter } from "./apiCareersAdapter";

const environment = { DEV: false, PROD: true, VITE_API_BASE_URL: "https://api.test" };

function response(items: unknown[], totalPages = 1, page = 1) {
  return new Response(
    JSON.stringify({
      data: { items, limit: 50, page, total: items.length, totalPages },
      message: "ok",
      success: true,
    }),
    { headers: { "Content-Type": "application/json" } },
  );
}

const career = {
  code: "SOFTWARE",
  description: null,
  id: "career-1",
  name: "Ingenieria de Software",
  unit: { code: "FISC", id: "unit-1", name: "Facultad de Sistemas" },
};

function toUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") {
    return input;
  }

  if (input instanceof URL) {
    return input.href;
  }

  return input.url;
}

function parseJsonBody(body: BodyInit | null | undefined) {
  if (typeof body !== "string")
    throw new Error("El cuerpo de la solicitud debe ser JSON serializado.");
  return JSON.parse(body) as unknown;
}

describe("createApiCareersAdapter", () => {
  it("should load every page anonymously", async () => {
    const fetcher = vi.fn((input: RequestInfo | URL, requestInit?: RequestInit) => {
      void requestInit;
      return Promise.resolve(
        toUrl(input).includes("page=2")
          ? response([{ ...career, id: "career-2", unit: null }], 2, 2)
          : response([career], 2, 1),
      );
    });

    const result = await createApiCareersAdapter({ environment, fetcher }).loadCareers();

    expect(result.map((candidate) => candidate.id)).toEqual(["career-1", "career-2"]);
    for (const [, requestInit] of fetcher.mock.calls) {
      expect(new Headers(requestInit?.headers).get("Authorization")).toBeNull();
    }
  });

  it("should send administrative commands with the current bearer token", async () => {
    let call = 0;
    const fetch = vi.fn((...args: Parameters<typeof globalThis.fetch>) => {
      void args;
      call += 1;
      return Promise.resolve(
        call === 3
          ? new Response(null, { status: 204 })
          : new Response(JSON.stringify({ data: career, message: "ok", success: true })),
      );
    });
    const fetcher = fetch as unknown as typeof globalThis.fetch;
    const adapter = createApiCareersAdapter({ environment, fetcher }, () => "access-token");

    await adapter.createCareer!({
      code: "DATA",
      description: null,
      name: "Ciencia de Datos",
      unitId: "unit-1",
    });
    await adapter.updateCareer!("career-1", { name: "Datos Aplicados" });
    await adapter.deleteCareer!("career-1");

    const [createCall, updateCall, deleteCall] = fetch.mock.calls;
    expect(createCall?.[0]).toContain("/api/v1/careers");
    expect(createCall?.[1]).toMatchObject({ method: "POST" });
    expect(new Headers(createCall?.[1]?.headers).get("Authorization")).toBe("Bearer access-token");
    expect(parseJsonBody(createCall?.[1]?.body)).toEqual({
      code: "DATA",
      description: null,
      name: "Ciencia de Datos",
      unitId: "unit-1",
    });
    expect(updateCall?.[0]).toContain("/api/v1/careers/career-1");
    expect(parseJsonBody(updateCall?.[1]?.body)).toEqual({ name: "Datos Aplicados" });
    expect(deleteCall?.[1]).toMatchObject({ method: "DELETE" });
  });

  it("only serializes contract fields for a create request", async () => {
    const fetch = vi.fn((...args: Parameters<typeof globalThis.fetch>) => {
      void args;
      return Promise.resolve(
        new Response(JSON.stringify({ data: career, message: "ok", success: true })),
      );
    });
    const adapter = createApiCareersAdapter(
      { environment, fetcher: fetch as unknown as typeof globalThis.fetch },
      () => "access-token",
    );

    await adapter.createCareer!({
      code: "DATA",
      description: null,
      name: "Ciencia de Datos",
      unitId: null,
      unsafe: "ignored",
    } as unknown as Parameters<NonNullable<typeof adapter.createCareer>>[0]);

    expect(parseJsonBody(fetch.mock.calls[0]?.[1]?.body)).toEqual({
      code: "DATA",
      description: null,
      name: "Ciencia de Datos",
      unitId: null,
    });
  });
});
