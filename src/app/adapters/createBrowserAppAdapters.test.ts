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
    expect(adapters.publicActivityCatalog.getPublicActivity).toBeTypeOf("function");
    expect(adapters.classrooms.loadClassrooms).toBeTypeOf("function");
    expect(adapters.users.loadUsers).toBeTypeOf("function");
    expect(adapters.eventPrograms.loadEventPrograms).toBeTypeOf("function");
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
    const published = catalog.activities[0]!;
    const detail = await adapters.publicActivityCatalog.getPublicActivity(published.id);

    expect(Array.isArray(catalog.activities)).toBe(true);
    expect(detail?.id).toBe(published.id);
  });

  it("loads the independent deferred program port in mock mode", async () => {
    const adapters = createBrowserAppAdapters({ source: "mock" });
    const programs = await adapters.eventPrograms.loadEventPrograms("administrative");
    expect(programs.length).toBeGreaterThan(0);
    expect(programs[0]).toHaveProperty("organizationalUnitId");
  });

  it("shares the mock program registry between the deferred ports", async () => {
    useSessionStore.getState().setSession({
      currentUser: createAuthenticatedUser(),
      tokens: createAuthTokens(),
    });
    const adapters = createBrowserAppAdapters({ source: "mock" });

    const created = await adapters.eventPrograms.createEventProgram!({
      description: "Programa diferido.",
      endDate: "2026-12-20",
      label: "Diferido",
      name: "Programa Diferido",
      organizationalUnitId: "fisc",
      startDate: "2026-12-18",
    });

    await expect(
      adapters.collaborators.loadCollaborators({ type: "program", id: created.id }),
    ).resolves.toEqual([]);
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

  it("shares the mock activity registry with the public catalog and classrooms", async () => {
    useSessionStore.getState().setSession({
      currentUser: createAuthenticatedUser(),
      tokens: createAuthTokens(),
    });
    const adapters = createBrowserAppAdapters({ source: "mock" });
    const criteria = { date: "2026-08-24", endTime: "09:00", startTime: "08:00" };

    const created = await adapters.activities.createActivity({
      classroomId: "aula-10",
      date: "2026-08-24",
      endTime: "09:00",
      eventProgramId: "program-fisc-default",
      maxCapacity: 30,
      name: "Ciclo diferido",
      startTime: "08:00",
      type: "WORKSHOP",
    });
    await adapters.activities.updateActivity(created.id, { status: "SCHEDULED" });

    expect(
      (await adapters.publicActivityCatalog.loadPublicActivities()).activities.map((a) => a.id),
    ).toContain(created.id);
    expect(
      (await adapters.classrooms.loadAvailableClassrooms!(criteria)).map((room) => room.id),
    ).not.toContain("aula-10");

    await adapters.activities.cancelActivity(created.id, { reason: "Sin luz" });

    expect(
      (await adapters.publicActivityCatalog.loadPublicActivities()).activities.map((a) => a.id),
    ).not.toContain(created.id);
    expect(
      (await adapters.classrooms.loadAvailableClassrooms!(criteria)).map((room) => room.id),
    ).toContain("aula-10");
  });

  it("should expose catalog summaries while the deferred detail keeps the full record", async () => {
    useSessionStore.getState().setSession({
      currentUser: createAuthenticatedUser(),
      tokens: createAuthTokens(),
    });
    const adapters = createBrowserAppAdapters({ source: "mock" });
    const created = await adapters.activities.createActivity({
      classroomId: "aula-10",
      date: "2026-08-24",
      endTime: "09:00",
      eventProgramId: "program-fisc-default",
      maxCapacity: 30,
      name: "Resumen diferido",
      startTime: "08:00",
      type: "WORKSHOP",
    });

    const catalog = await adapters.activityCatalog.loadCatalog("all-programs");
    const summary = catalog.activities.find((activity) => activity.id === created.id);

    expect(summary).toBeDefined();
    expect(summary).not.toHaveProperty("equipment");

    const detail = await adapters.activities.getActivity(created.id);

    expect(detail.equipment).toEqual([]);
    expect(detail.enrolledCount).toBe(0);
  });

  it("should isolate mutations between browser compositions", async () => {
    useSessionStore.getState().setSession({
      currentUser: createAuthenticatedUser(),
      tokens: createAuthTokens(),
    });
    const first = createBrowserAppAdapters({ source: "mock" });
    const second = createBrowserAppAdapters({ source: "mock" });

    const created = await first.activities.createActivity({
      classroomId: "aula-10",
      date: "2026-08-24",
      endTime: "09:00",
      eventProgramId: "program-fisc-default",
      maxCapacity: 30,
      name: "Aislada",
      startTime: "08:00",
      type: "WORKSHOP",
    });
    await first.activities.updateActivity(created.id, { status: "SCHEDULED" });

    await expect(second.activities.getActivity(created.id)).rejects.toMatchObject({ status: 404 });
    expect(
      (await second.publicActivityCatalog.loadPublicActivities()).activities.map((a) => a.id),
    ).not.toContain(created.id);
  });

  it("should delete a runtime draft through the deferred mock ports", async () => {
    useSessionStore.getState().setSession({
      currentUser: createAuthenticatedUser(),
      tokens: createAuthTokens(),
    });
    const adapters = createBrowserAppAdapters({ source: "mock" });
    const created = await adapters.activities.createActivity({
      classroomId: "aula-10",
      date: "2026-08-24",
      endTime: "09:00",
      eventProgramId: "program-fisc-default",
      maxCapacity: 30,
      name: "Borrador diferido eliminable",
      startTime: "08:00",
      type: "WORKSHOP",
    });
    const activityScope = { type: "activity" as const, id: created.id };

    await adapters.collaborators.addCollaborator(activityScope, {
      userId: "user-2",
      role: "EDITOR",
    });

    await adapters.activities.deleteActivity(created.id);

    await expect(adapters.activities.getActivity(created.id)).rejects.toMatchObject({
      status: 404,
    });
    const catalog = await adapters.activityCatalog.loadCatalog("all-programs");
    expect(catalog.activities.map((activity) => activity.id)).not.toContain(created.id);
    const scopes = await adapters.userScopes.loadUserScopes();
    expect(scopes.map((scope) => scope.id)).not.toContain(created.id);
    await expect(adapters.collaborators.loadCollaborators(activityScope)).rejects.toMatchObject({
      status: 404,
    });
  });
});
