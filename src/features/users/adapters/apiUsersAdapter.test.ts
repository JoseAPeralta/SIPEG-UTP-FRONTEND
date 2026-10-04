import { describe, expect, it, vi } from "vitest";

import { createApiUsersAdapter } from "./apiUsersAdapter";
import { AdminUsersMappingError } from "./usersMapper";

const environment = { DEV: false, PROD: true, VITE_API_BASE_URL: "https://api.test" };

const adminUser = {
  career: null,
  email: "mariana.rodriguez@example.edu",
  firstName: "Mariana",
  globalRole: "ADMIN",
  id: "user-1",
  identificationNumber: "8-123-456",
  isActive: true,
  lastName: "Rodriguez",
  unit: { code: "FISC", id: "fisc", name: "Facultad de Ingenieria de Sistemas" },
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

describe("createApiUsersAdapter", () => {
  it("should load every page with the maximum limit and the bearer token", async () => {
    const fetcher = vi.fn((input: RequestInfo | URL, requestInit?: RequestInit) => {
      void requestInit;
      return Promise.resolve(
        toUrl(input).includes("page=2")
          ? response([{ ...adminUser, id: "user-2" }], 2, 2)
          : response([adminUser], 2, 1),
      );
    });
    const adapter = createApiUsersAdapter({ environment, fetcher }, () => "access-token");

    const users = await adapter.loadUsers();

    expect(users.map((user) => user.id)).toEqual(["user-1", "user-2"]);
    const urls = fetcher.mock.calls.map(([input]) => toUrl(input));
    expect(urls[0]).toContain("/api/v1/admin/users?page=1&limit=50");
    expect(urls[1]).toContain("/api/v1/admin/users?page=2&limit=50");
    for (const [, requestInit] of fetcher.mock.calls) {
      expect(new Headers(requestInit?.headers).get("Authorization")).toBe("Bearer access-token");
    }
  });

  it("should read the token when the request runs, not when the adapter is created", async () => {
    let token = "first-token";
    const fetcher = vi.fn((input: RequestInfo | URL, requestInit?: RequestInit) => {
      void input;
      void requestInit;
      return Promise.resolve(response([adminUser]));
    });
    const adapter = createApiUsersAdapter({ environment, fetcher }, () => token);

    token = "rotated-token";
    await adapter.loadUsers();

    const [, requestInit] = fetcher.mock.calls[0] ?? [];
    expect(new Headers(requestInit?.headers).get("Authorization")).toBe("Bearer rotated-token");
  });

  it("should reject a payload that does not match the contract", async () => {
    const fetcher = vi.fn(() =>
      Promise.resolve(response([{ ...adminUser, globalRole: "SUPERVISOR" }])),
    );
    const adapter = createApiUsersAdapter({ environment, fetcher }, () => "access-token");

    await expect(adapter.loadUsers()).rejects.toThrow(AdminUsersMappingError);
  });
});
