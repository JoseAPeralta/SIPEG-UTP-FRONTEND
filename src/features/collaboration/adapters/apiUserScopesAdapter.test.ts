import { describe, expect, it, vi } from "vitest";

import { createApiUserScopesAdapter, userScopesQuery } from "./apiUserScopesAdapter";
import { CollaborationMappingError } from "./userScopesMapper";

const environment = { DEV: false, PROD: true, VITE_API_BASE_URL: "https://api.test" };

const programScope = {
  eventProgram: null,
  id: "program-fisc-default",
  name: "Programa de Eventos de Ingenieria de Sistemas",
  organizationalUnit: { id: "fisc", name: "Facultad de Ingenieria de Sistemas", type: "FACULTY" },
  permissions: [{ name: "program:read", origin: "LOCAL", validFrom: null, validUntil: null }],
  status: "ACTIVE",
  type: "program",
};

const draftActivityScope = {
  eventProgram: {
    id: "program-fisc-default",
    label: "FISC",
    name: "Programa de Eventos de Ingenieria de Sistemas",
    status: "DRAFT",
  },
  id: "activity-draft-open-data",
  name: "Actividad en preparacion",
  organizationalUnit: { id: "fisc", name: "Facultad de Ingenieria de Sistemas", type: "FACULTY" },
  permissions: [
    { name: "activity:update", origin: "INHERITED", validFrom: null, validUntil: null },
  ],
  status: "DRAFT",
  type: "activity",
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

describe("userScopesQuery", () => {
  it("should paginate without inventing filters", () => {
    expect(userScopesQuery({}, 3)).toBe("/api/v1/users/me/scopes?limit=50&page=3");
  });

  it("should translate the optional type filter", () => {
    expect(userScopesQuery({ type: "activity" }, 1)).toBe(
      "/api/v1/users/me/scopes?limit=50&page=1&type=activity",
    );
  });
});

describe("createApiUserScopesAdapter", () => {
  it("should discover non-public scopes with one paginated request and the bearer token", async () => {
    const fetcher = vi.fn((input: RequestInfo | URL, requestInit?: RequestInit) => {
      void input;
      void requestInit;
      return Promise.resolve(response([programScope, draftActivityScope]));
    });
    const adapter = createApiUserScopesAdapter({ environment, fetcher }, () => "access-token");

    const scopes = await adapter.loadUserScopes();

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(scopes.map((scope) => scope.id)).toEqual([
      "program-fisc-default",
      "activity-draft-open-data",
    ]);
    expect(scopes.map((scope) => scope.status)).toContain("DRAFT");

    const url = toUrl(fetcher.mock.calls[0]![0]);
    expect(url).toContain("/api/v1/users/me/scopes?limit=50&page=1");
    expect(url).not.toContain("id=");
    const [, requestInit] = fetcher.mock.calls[0] ?? [];
    expect(new Headers(requestInit?.headers).get("Authorization")).toBe("Bearer access-token");
  });

  it("should walk every page without repeating items", async () => {
    const fetcher = vi.fn((input: RequestInfo | URL, requestInit?: RequestInit) => {
      void requestInit;
      return Promise.resolve(
        toUrl(input).includes("page=2")
          ? response([draftActivityScope], 2, 2)
          : response([programScope], 2, 1),
      );
    });
    const adapter = createApiUserScopesAdapter({ environment, fetcher }, () => "access-token");

    const scopes = await adapter.loadUserScopes();

    expect(scopes.map((scope) => scope.id)).toEqual([
      "program-fisc-default",
      "activity-draft-open-data",
    ]);
    const urls = fetcher.mock.calls.map(([input]) => toUrl(input));
    expect(urls[0]).toContain("page=1");
    expect(urls[1]).toContain("page=2");
  });

  it("should keep the type filter across pages", async () => {
    const fetcher = vi.fn((input: RequestInfo | URL, requestInit?: RequestInit) => {
      void requestInit;
      return Promise.resolve(
        toUrl(input).includes("page=2")
          ? response([{ ...draftActivityScope, id: "activity-2" }], 2, 2)
          : response([draftActivityScope], 2, 1),
      );
    });
    const adapter = createApiUserScopesAdapter({ environment, fetcher }, () => "access-token");

    await adapter.loadUserScopes({ type: "activity" });

    for (const [input] of fetcher.mock.calls) {
      expect(toUrl(input)).toContain("type=activity");
    }
  });

  it("should read the token when the request runs, not when the adapter is created", async () => {
    let token = "first-token";
    const fetcher = vi.fn((input: RequestInfo | URL, requestInit?: RequestInit) => {
      void input;
      void requestInit;
      return Promise.resolve(response([programScope]));
    });
    const adapter = createApiUserScopesAdapter({ environment, fetcher }, () => token);

    token = "rotated-token";
    await adapter.loadUserScopes();

    const [, requestInit] = fetcher.mock.calls[0] ?? [];
    expect(new Headers(requestInit?.headers).get("Authorization")).toBe("Bearer rotated-token");
  });

  it("should reject a payload that does not match the contract", async () => {
    const fetcher = vi.fn(() =>
      Promise.resolve(response([{ ...programScope, status: "RESCHEDULED" }])),
    );
    const adapter = createApiUserScopesAdapter({ environment, fetcher }, () => "access-token");

    await expect(adapter.loadUserScopes()).rejects.toThrow(CollaborationMappingError);
  });
});
