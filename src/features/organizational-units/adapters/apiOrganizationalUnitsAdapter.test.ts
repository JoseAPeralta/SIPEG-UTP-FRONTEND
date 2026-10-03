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
});
