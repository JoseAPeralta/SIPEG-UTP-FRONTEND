// @vitest-environment node

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createAuthTokens,
  createAuthenticatedUser,
  createAdminUser,
  createAlertsPage,
  createClassroomDetail,
} from "@/test/factories";
import { useSessionStore } from "@/store/session";

import { createBrowserAppAdapters } from "./createBrowserAppAdapters";

function toUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") {
    return input;
  }

  if (input instanceof URL) {
    return input.href;
  }

  return input.url;
}

describe("createBrowserAppAdapters", () => {
  afterEach(() => useSessionStore.getState().clearSession());

  it("exposes deferred ports without loading their implementations", () => {
    const adapters = createBrowserAppAdapters({ source: "api" });

    expect(adapters.auth.refresh).toBeTypeOf("function");
    expect(adapters.alerts.loadAlertsPage).toBeTypeOf("function");
    expect(adapters.publicActivityCatalog.loadPublicActivities).toBeTypeOf("function");
    expect(adapters.classrooms.loadClassrooms).toBeTypeOf("function");
    expect(adapters.users.loadUsers).toBeTypeOf("function");
  });

  it("keeps port methods added after the composition root was written reachable", async () => {
    const adapters = createBrowserAppAdapters({ source: "mock" });
    const getClassroom = adapters.classrooms.getClassroom;
    const createCareer = adapters.careers.createCareer;

    expect(getClassroom).toBeTypeOf("function");
    expect(createCareer).toBeTypeOf("function");

    await expect(getClassroom?.("aula-10")).resolves.toMatchObject({ id: "aula-10" });
    await expect(
      createCareer?.({ code: "NUEVA", description: null, name: "Carrera nueva", unitId: null }),
    ).resolves.toMatchObject({ code: "NUEVA" });
  });

  it("loads only the invoked mock adapter", async () => {
    const adapters = createBrowserAppAdapters({ source: "mock" });

    const catalog = await adapters.publicActivityCatalog.loadPublicActivities();

    expect(Array.isArray(catalog.activities)).toBe(true);
  });

  it("reads the current access token when a deferred classroom command runs", async () => {
    useSessionStore.getState().setSession({
      currentUser: createAuthenticatedUser(),
      tokens: createAuthTokens({ accessToken: "current-access-token" }),
    });
    const fetcher = vi.fn((input: RequestInfo | URL, requestInit?: RequestInit) => {
      void input;
      void requestInit;

      return Promise.resolve(
        new Response(
          JSON.stringify({ data: createClassroomDetail(), message: "ok", success: true }),
          { headers: { "Content-Type": "application/json" } },
        ),
      );
    });
    const adapters = createBrowserAppAdapters({
      apiOptions: {
        environment: { DEV: false, PROD: true, VITE_API_BASE_URL: "https://api.test" },
        fetcher,
      },
      source: "api",
    });

    await adapters.classrooms.createClassroom!({
      building: null,
      capacity: 30,
      floor: null,
      name: "Aula 201",
      type: "CLASSROOM",
    });

    const [, requestInit] = fetcher.mock.calls[0] ?? [];
    expect(new Headers(requestInit?.headers).get("Authorization")).toBe(
      "Bearer current-access-token",
    );
  });

  it("reads the current access token when a deferred user listing runs", async () => {
    useSessionStore.getState().setSession({
      currentUser: createAuthenticatedUser(),
      tokens: createAuthTokens({ accessToken: "current-access-token" }),
    });
    const fetcher = vi.fn((input: RequestInfo | URL, requestInit?: RequestInit) => {
      void input;
      void requestInit;

      return Promise.resolve(
        new Response(
          JSON.stringify({
            data: { items: [createAdminUser()], limit: 50, page: 1, total: 1, totalPages: 1 },
            message: "ok",
            success: true,
          }),
          { headers: { "Content-Type": "application/json" } },
        ),
      );
    });
    const adapters = createBrowserAppAdapters({
      apiOptions: {
        environment: { DEV: false, PROD: true, VITE_API_BASE_URL: "https://api.test" },
        fetcher,
      },
      source: "api",
    });

    await adapters.users.loadUsers();

    const urls = fetcher.mock.calls.map(([input]) => toUrl(input));
    const [, requestInit] = fetcher.mock.calls[0] ?? [];

    expect(urls[0]).toContain("/api/v1/admin/users?page=1&limit=50");
    expect(new Headers(requestInit?.headers).get("Authorization")).toBe(
      "Bearer current-access-token",
    );
  });

  it("reads the current access token when a deferred alert listing runs", async () => {
    useSessionStore.getState().setSession({
      currentUser: createAuthenticatedUser(),
      tokens: createAuthTokens({ accessToken: "current-access-token" }),
    });
    const fetcher = vi.fn((input: RequestInfo | URL, requestInit?: RequestInit) => {
      void input;
      void requestInit;

      return Promise.resolve(
        new Response(JSON.stringify({ data: createAlertsPage(), message: "ok", success: true }), {
          headers: { "Content-Type": "application/json" },
        }),
      );
    });
    const adapters = createBrowserAppAdapters({
      apiOptions: {
        environment: { DEV: false, PROD: true, VITE_API_BASE_URL: "https://api.test" },
        fetcher,
      },
      source: "api",
    });

    await adapters.alerts.loadAlertsPage({}, 1);

    const [, requestInit] = fetcher.mock.calls[0] ?? [];
    expect(new Headers(requestInit?.headers).get("Authorization")).toBe(
      "Bearer current-access-token",
    );
  });
});
