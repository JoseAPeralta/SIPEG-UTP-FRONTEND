// @vitest-environment node

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

function singleResponse(user: unknown) {
  return new Response(JSON.stringify({ data: user, message: "ok", success: true }), {
    headers: { "Content-Type": "application/json" },
  });
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

describe("createApiUsersAdapter page and commands", () => {
  it("should translate every filter to the query string and keep the page metadata", async () => {
    const fetcher = vi.fn((input: RequestInfo | URL, requestInit?: RequestInit) => {
      void requestInit;
      void input;
      return Promise.resolve(response([adminUser], 4, 3));
    });
    const adapter = createApiUsersAdapter({ environment, fetcher }, () => "access-token");

    const page = await adapter.loadUsersPage!(
      {
        careerId: "software",
        globalRole: "ADMIN",
        isActive: false,
        q: "mariana",
        unitId: "fisc",
      },
      3,
    );

    const url = toUrl(fetcher.mock.calls[0]![0]);
    expect(url).toContain("page=3");
    expect(url).toContain("limit=20");
    expect(url).toContain("q=mariana");
    expect(url).toContain("globalRole=ADMIN");
    expect(url).toContain("isActive=false");
    expect(url).toContain("unitId=fisc");
    expect(url).toContain("careerId=software");
    expect(page.page).toBe(3);
    expect(page.totalPages).toBe(4);
    const [, requestInit] = fetcher.mock.calls[0] ?? [];
    expect(new Headers(requestInit?.headers).get("Authorization")).toBe("Bearer access-token");
  });

  it("should omit absent filters from the query string", async () => {
    const fetcher = vi.fn((input: RequestInfo | URL, requestInit?: RequestInit) => {
      void input;
      void requestInit;
      return Promise.resolve(response([adminUser]));
    });
    const adapter = createApiUsersAdapter({ environment, fetcher }, () => "access-token");

    await adapter.loadUsersPage!({}, 1);

    const url = toUrl(fetcher.mock.calls[0]![0]);
    expect(url).toContain("page=1");
    expect(url).toContain("limit=20");
    expect(url).not.toContain("q=");
    expect(url).not.toContain("isActive=");
    expect(url).not.toContain("globalRole=");
  });

  it("should load one user by id with the bearer token", async () => {
    const fetcher = vi.fn((input: RequestInfo | URL, requestInit?: RequestInit) => {
      void input;
      void requestInit;
      return Promise.resolve(singleResponse(adminUser));
    });
    const adapter = createApiUsersAdapter({ environment, fetcher }, () => "access-token");

    await expect(adapter.getUser!("user-1")).resolves.toEqual(adminUser);

    const url = toUrl(fetcher.mock.calls[0]![0]);
    expect(url).toContain("/api/v1/admin/users/user-1");
    const [, requestInit] = fetcher.mock.calls[0] ?? [];
    expect(new Headers(requestInit?.headers).get("Authorization")).toBe("Bearer access-token");
  });

  it("should rebuild the create body from the allowlist and ignore injected properties", async () => {
    const fetcher = vi.fn((input: RequestInfo | URL, requestInit?: RequestInit) => {
      void input;
      void requestInit;
      return Promise.resolve(singleResponse(adminUser));
    });
    const adapter = createApiUsersAdapter({ environment, fetcher }, () => "access-token");

    await adapter.createUser!({
      email: "nueva@example.edu",
      firstName: "Nueva",
      globalRole: "ADMIN",
      identificationNumber: "8-000-000",
      id: "injected-id",
      lastName: "Cuenta",
      password: "contrasena-larga",
      unitId: null,
    } as never);

    const [, requestInit] = fetcher.mock.calls[0] ?? [];
    expect(requestInit?.method).toBe("POST");
    expect(JSON.parse(requestInit?.body as string)).toEqual({
      email: "nueva@example.edu",
      firstName: "Nueva",
      identificationNumber: "8-000-000",
      lastName: "Cuenta",
      password: "contrasena-larga",
      unitId: null,
    });
  });

  it("should send only the present fields on patch, including a null unit", async () => {
    const fetcher = vi.fn((input: RequestInfo | URL, requestInit?: RequestInit) => {
      void input;
      void requestInit;
      return Promise.resolve(singleResponse(adminUser));
    });
    const adapter = createApiUsersAdapter({ environment, fetcher }, () => "access-token");

    await adapter.updateUser!("user-1", { isActive: false, unitId: null });

    const url = toUrl(fetcher.mock.calls[0]![0]);
    expect(url).toContain("/api/v1/admin/users/user-1");
    const [, requestInit] = fetcher.mock.calls[0] ?? [];
    expect(requestInit?.method).toBe("PATCH");
    expect(JSON.parse(requestInit?.body as string)).toEqual({ isActive: false, unitId: null });
  });

  it("should reject a malformed single-user envelope", async () => {
    const fetcher = vi.fn((input: RequestInfo | URL, requestInit?: RequestInit) => {
      void input;
      void requestInit;
      return Promise.resolve(singleResponse({ ...adminUser, globalRole: "SUPERVISOR" }));
    });
    const adapter = createApiUsersAdapter({ environment, fetcher }, () => "access-token");

    await expect(adapter.getUser!("user-1")).rejects.toThrow(AdminUsersMappingError);
  });
});
