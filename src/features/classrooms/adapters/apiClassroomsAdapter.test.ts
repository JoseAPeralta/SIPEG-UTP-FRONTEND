import { describe, expect, it, vi } from "vitest";

import { createApiClassroomsAdapter } from "./apiClassroomsAdapter";

const environment = { DEV: false, PROD: true, VITE_API_BASE_URL: "https://api.test" };
const classroom = {
  amenities: ["projector"],
  building: "Aulas",
  capacity: 40,
  floor: 1,
  id: "classroom-1",
  isActive: true,
  name: "Aula 101",
  type: "CLASSROOM",
};

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

function toUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") {
    return input;
  }

  if (input instanceof URL) {
    return input.href;
  }

  return input.url;
}

describe("createApiClassroomsAdapter", () => {
  it("should load every page anonymously", async () => {
    const fetcher = vi.fn((input: RequestInfo | URL, requestInit?: RequestInit) => {
      void requestInit;
      return Promise.resolve(
        toUrl(input).includes("page=2")
          ? response([{ ...classroom, id: "classroom-2" }], 2, 2)
          : response([classroom], 2, 1),
      );
    });

    const result = await createApiClassroomsAdapter({ environment, fetcher }).loadClassrooms();

    expect(result.map((candidate) => candidate.id)).toEqual(["classroom-1", "classroom-2"]);
    for (const [, requestInit] of fetcher.mock.calls) {
      expect(new Headers(requestInit?.headers).get("Authorization")).toBeNull();
    }
  });
});
