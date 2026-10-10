// @vitest-environment node

import { describe, expect, it, vi } from "vitest";

import { createApiOrganizationalUnitsAdapter } from "./apiOrganizationalUnitsAdapter";

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

const unit = {
  code: "FISC",
  description: null,
  head: null,
  id: "unit-1",
  isActive: true,
  name: "Facultad de Sistemas",
  type: "FACULTY",
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

describe("createApiOrganizationalUnitsAdapter", () => {
  it("should load every page without sending authorization", async () => {
    const fetcher = vi.fn((input: RequestInfo | URL, requestInit?: RequestInit) => {
      void requestInit;
      const url = toUrl(input);
      return Promise.resolve(
        url.includes("page=2")
          ? response([{ ...unit, code: "FIC", id: "unit-2" }], 2, 2)
          : response([unit], 2, 1),
      );
    });

    const result = await createApiOrganizationalUnitsAdapter({
      environment,
      fetcher,
    }).loadOrganizationalUnits();

    expect(result.map((candidate) => candidate.id)).toEqual(["unit-1", "unit-2"]);
    expect(fetcher).toHaveBeenCalledTimes(2);
    for (const [, requestInit] of fetcher.mock.calls) {
      expect(new Headers(requestInit?.headers).get("Authorization")).toBeNull();
    }
  });

  it("should merge both listings and deduplicate by id for the all filter", async () => {
    const fetcher = vi.fn((input: RequestInfo | URL, requestInit?: RequestInit) => {
      void requestInit;
      const url = new URL(toUrl(input));

      if (url.searchParams.get("isActive") === "false") {
        return Promise.resolve(
          response([unit, { ...unit, code: "FIC", id: "unit-2", isActive: false }]),
        );
      }

      return Promise.resolve(response([unit]));
    });

    const result = await createApiOrganizationalUnitsAdapter({
      environment,
      fetcher,
    }).loadOrganizationalUnits({ isActive: "all" });

    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(result.map((candidate) => candidate.id)).toEqual(["unit-1", "unit-2"]);
    const searchParams = fetcher.mock.calls.map(([input]) => new URL(toUrl(input)).searchParams);
    expect(searchParams.map((params) => params.get("isActive"))).toEqual([null, "false"]);
    for (const [, requestInit] of fetcher.mock.calls) {
      expect(new Headers(requestInit?.headers).get("Authorization")).toBeNull();
    }
  });

  it("should request only inactive units for the inactive filter", async () => {
    const fetcher = vi.fn<typeof fetch>(() =>
      Promise.resolve(response([{ ...unit, code: "FIC", id: "unit-2", isActive: false }])),
    );

    const result = await createApiOrganizationalUnitsAdapter({
      environment,
      fetcher,
    }).loadOrganizationalUnits({ isActive: "inactive" });

    const [input] = fetcher.mock.calls[0]!;
    expect(new URL(toUrl(input)).searchParams.get("isActive")).toBe("false");
    expect(result.map((candidate) => candidate.id)).toEqual(["unit-2"]);
  });

  it("should omit isActive by default", async () => {
    const fetcher = vi.fn<typeof fetch>(() => Promise.resolve(response([unit])));

    await createApiOrganizationalUnitsAdapter({ environment, fetcher }).loadOrganizationalUnits();

    const [input] = fetcher.mock.calls[0]!;
    expect(new URL(toUrl(input)).searchParams.has("isActive")).toBe(false);
  });

  it("should create a unit with the current access token and map its detail", async () => {
    const fetcher = vi.fn(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            data: { ...unit, careers: [], defaultProgram: null },
            message: "created",
            success: true,
          }),
          { status: 201, headers: { "Content-Type": "application/json" } },
        ),
      ),
    );

    const result = await createApiOrganizationalUnitsAdapter(
      { environment, fetcher },
      () => "access-1",
    ).createOrganizationalUnit!({
      code: "FISC",
      description: null,
      name: "Facultad de Sistemas",
      type: "FACULTY",
    });

    const [, init] = fetcher.mock.calls[0] as unknown as [RequestInfo | URL, RequestInit];
    expect(result.defaultProgram).toBeNull();
    expect(new Headers(init.headers).get("Authorization")).toBe("Bearer access-1");
    expect(init).toMatchObject({
      body: JSON.stringify({
        code: "FISC",
        description: null,
        name: "Facultad de Sistemas",
        type: "FACULTY",
      }),
      method: "POST",
    });
  });
});
