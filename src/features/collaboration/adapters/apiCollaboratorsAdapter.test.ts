// @vitest-environment node
import { expect, it, vi } from "vitest";
import { createApiCollaboratorsAdapter } from "./apiCollaboratorsAdapter";
const environment = { DEV: false, PROD: true, VITE_API_BASE_URL: "https://api.test" };
const urlOf = (input: RequestInfo | URL) =>
  typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
const collaborator = {
  userId: "u-1",
  firstName: "Ana",
  lastName: "Pérez",
  email: "ana@example.test",
  role: "VIEWER",
  createdAt: "2026-01-01T00:00:00Z",
  permissions: [],
};
it.each(["program", "activity"] as const)(
  "uses %s operations with encoded identifiers and body allowlists",
  async (type) => {
    const fetcher = vi.fn((_input: RequestInfo | URL, init?: RequestInit) =>
      Promise.resolve(
        init?.method === "DELETE"
          ? new Response(null, { status: 204 })
          : new Response(
              JSON.stringify({
                success: true,
                message: "ok",
                data: init?.method === "GET" ? { items: [collaborator] } : collaborator,
              }),
              { headers: { "Content-Type": "application/json" } },
            ),
      ),
    );
    const adapter = createApiCollaboratorsAdapter({ environment, fetcher }, () => "token");
    const scope = { type, id: "scope /1" };
    expect(await adapter.loadCollaborators(scope)).toEqual([collaborator]);
    await adapter.addCollaborator(scope, { userId: "u-1", role: "VIEWER", injected: true } as {
      userId: string;
      role: "VIEWER";
    });
    await adapter.changeCollaboratorRole(scope, "u /1", { role: "EDITOR", injected: true } as {
      role: "EDITOR";
    });
    await adapter.grantPermission(scope, {
      userId: "u-2",
      permission: "activity:read",
      validFrom: null,
      validUntil: "2026-11-01T05:00:00.000Z",
      injected: true,
    } as {
      userId: string;
      permission: "activity:read";
      validFrom: null;
      validUntil: string;
    });
    await expect(
      adapter.revokePermission(scope, { userId: "u /1", permission: "activity:read" }),
    ).resolves.toBeUndefined();
    await expect(adapter.removeCollaborator(scope, "u /1")).resolves.toBeUndefined();
    expect(urlOf(fetcher.mock.calls[0]![0])).toContain(
      `/${type === "program" ? "event-programs" : "activities"}/scope%20%2F1/collaborators`,
    );
    expect(JSON.parse(fetcher.mock.calls[1]![1]?.body as string)).toEqual({
      userId: "u-1",
      role: "VIEWER",
    });
    expect(JSON.parse(fetcher.mock.calls[2]![1]?.body as string)).toEqual({ role: "EDITOR" });
    expect(urlOf(fetcher.mock.calls[2]![0])).toContain("u%20%2F1");
    expect(urlOf(fetcher.mock.calls[3]![0])).toContain(
      `/${type === "program" ? "event-programs" : "activities"}/scope%20%2F1/permissions`,
    );
    expect(JSON.parse(fetcher.mock.calls[3]![1]?.body as string)).toEqual({
      userId: "u-2",
      permission: "activity:read",
      validFrom: null,
      validUntil: "2026-11-01T05:00:00.000Z",
    });
    expect(urlOf(fetcher.mock.calls[4]![0])).toContain(
      `/permissions/activity%3Aread?userId=u%20%2F1`,
    );
    expect(new Headers(fetcher.mock.calls[0]![1]?.headers).get("Authorization")).toBe(
      "Bearer token",
    );
  },
);
it.each([403, 409, 404])("keeps status %s without leaking backend errors", async (status) => {
  const adapter = createApiCollaboratorsAdapter(
    {
      environment,
      fetcher: vi.fn(() =>
        Promise.resolve(new Response(JSON.stringify({ message: "secret" }), { status })),
      ),
    },
    () => "token",
  );
  await expect(
    adapter.removeCollaborator({ type: "activity", id: "a" }, "u"),
  ).rejects.toMatchObject({ status });
  await expect(
    adapter.grantPermission(
      { type: "activity", id: "a" },
      { userId: "u", permission: "activity:read", validFrom: null, validUntil: null },
    ),
  ).rejects.toMatchObject({ status });
  await expect(
    adapter.revokePermission(
      { type: "activity", id: "a" },
      { userId: "u", permission: "activity:read" },
    ),
  ).rejects.toMatchObject({ status });
  await expect(adapter.loadCollaborators({ type: "activity", id: "a" })).rejects.not.toThrow(
    "secret",
  );
});
