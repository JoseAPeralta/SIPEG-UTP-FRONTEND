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
});
