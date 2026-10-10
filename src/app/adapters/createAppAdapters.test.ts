// @vitest-environment node

import { afterEach, describe, expect, it, vi } from "vitest";

import { createAppAdapters, resolveDataSource } from "./createAppAdapters";
import { OPERATIONS_CONTRACT_PENDING_MESSAGE } from "@/features/operations/adapters";
import { useSessionStore } from "@/store/session";
import { createAuthenticatedUser, createAuthTokens } from "@/test/factories";

describe("resolveDataSource", () => {
  it("should default to the api source", () => {
    expect(resolveDataSource({})).toBe("api");
    expect(resolveDataSource({ VITE_DATA_SOURCE: "unexpected" })).toBe("api");
  });

  it("should select the mock source only when explicitly configured", () => {
    expect(resolveDataSource({ VITE_DATA_SOURCE: "mock" })).toBe("mock");
  });
});

describe("createAppAdapters", () => {
  afterEach(() => {
    useSessionStore.getState().clearSession();
  });

  it("should wire mock adapters when the mock source is explicit", async () => {
    const adapters = createAppAdapters({ source: "mock" });
    const catalog = await adapters.activityCatalog.loadCatalog();

    expect(catalog.activities.length).toBeGreaterThan(0);
    expect(adapters.auth.login).toBeTypeOf("function");
    await expect(adapters.alerts.loadAlertsPage({}, 1)).resolves.toBeTruthy();
    await expect(adapters.careers.loadCareers()).resolves.toBeTruthy();
    await expect(adapters.classrooms.loadClassrooms()).resolves.toBeTruthy();
    await expect(adapters.eventPrograms.loadEventPrograms("administrative")).resolves.toBeTruthy();
    await expect(adapters.organizationalUnits.loadOrganizationalUnits()).resolves.toBeTruthy();
    expect(adapters.registration.register).toBeTypeOf("function");
    await expect(adapters.users.loadUsers()).resolves.toBeTruthy();
    await expect(adapters.userScopes.loadUserScopes()).resolves.toBeTruthy();
    await expect(adapters.operations.loadOperations()).resolves.toBeTruthy();
    await expect(
      adapters.publicActivityCatalog.getPublicActivity("activity-open-data-governance"),
    ).resolves.toMatchObject({ id: "activity-open-data-governance" });
  });

  it("should expose catalog summaries and keep the full detail in the activity port", async () => {
    useSessionStore.getState().setSession({
      currentUser: createAuthenticatedUser(),
      tokens: createAuthTokens(),
    });
    const adapters = createAppAdapters({ source: "mock" });
    const created = await adapters.activities.createActivity({
      classroomId: "aula-10",
      date: "2026-08-24",
      endTime: "09:00",
      eventProgramId: "program-fisc-default",
      maxCapacity: 30,
      name: "Resumen y detalle",
      startTime: "08:00",
      type: "WORKSHOP",
    });

    const catalog = await adapters.activityCatalog.loadCatalog("all-programs");
    const summary = catalog.activities.find((activity) => activity.id === created.id);

    expect(summary).toBeDefined();
    expect(summary).not.toHaveProperty("equipment");

    const detail = await adapters.activities.getActivity(created.id);

    expect(detail).toMatchObject({ id: created.id, status: "DRAFT" });
    expect(detail.equipment).toEqual([]);
    expect(detail.enrolledCount).toBe(0);
  });

  it("shares the mock event program state with the collaborators adapter", async () => {
    useSessionStore.getState().setSession({
      currentUser: createAuthenticatedUser(),
      tokens: createAuthTokens(),
    });
    const adapters = createAppAdapters({ source: "mock" });

    const created = await adapters.eventPrograms.createEventProgram!({
      description: "Programa temporal para colaboradores.",
      endDate: "2026-12-20",
      label: "Prueba de colaboradores",
      name: "Programa de Colaboradores",
      organizationalUnitId: "fisc",
      startDate: "2026-12-18",
    });
    const scope = { type: "program" as const, id: created.id };

    await expect(adapters.collaborators.loadCollaborators(scope)).resolves.toEqual([]);
    await expect(
      adapters.collaborators.addCollaborator(scope, { userId: "user-2", role: "EDITOR" }),
    ).resolves.toMatchObject({ userId: "user-2" });

    await adapters.eventPrograms.archiveEventProgram!(created.id);

    await expect(
      adapters.collaborators.addCollaborator(scope, { userId: "user-3", role: "EDITOR" }),
    ).rejects.toMatchObject({ status: 409 });
    await expect(adapters.collaborators.loadCollaborators(scope)).resolves.toBeTruthy();
  });

  it("should keep operations unavailable while the API source lacks contracts", async () => {
    const adapters = createAppAdapters({ source: "api" });

    expect(adapters.auth.login).toBeTypeOf("function");
    expect(adapters.registration.register).toBeTypeOf("function");
    await expect(adapters.operations.loadOperations()).rejects.toThrow(
      OPERATIONS_CONTRACT_PENDING_MESSAGE,
    );
  });

  it("should authenticate API requests with the in-memory session token", async () => {
    useSessionStore.getState().setSession({
      currentUser: createAuthenticatedUser(),
      tokens: createAuthTokens({ accessToken: "session-access-token" }),
    });
    const fetcher = vi.fn().mockRejectedValue(new TypeError("offline"));
    const adapters = createAppAdapters({ apiOptions: { fetcher }, source: "api" });

    await expect(adapters.activityCatalog.loadCatalog()).rejects.toThrow(/conectar/i);

    const requestInit = fetcher.mock.calls[0]?.[1] as RequestInit | undefined;

    expect(new Headers(requestInit?.headers).get("Authorization")).toBe(
      "Bearer session-access-token",
    );
  });

  it("should keep public catalog requests anonymous even with an authenticated session", async () => {
    useSessionStore.getState().setSession({
      currentUser: createAuthenticatedUser(),
      tokens: createAuthTokens({ accessToken: "session-access-token" }),
    });
    const fetcher = vi.fn().mockRejectedValue(new TypeError("offline"));
    const adapters = createAppAdapters({ apiOptions: { fetcher }, source: "api" });

    await expect(adapters.publicActivityCatalog.loadPublicActivities()).rejects.toThrow(
      /conectar/i,
    );

    const requestInit = fetcher.mock.calls[0]?.[1] as RequestInit | undefined;

    expect(new Headers(requestInit?.headers).get("Authorization")).toBeNull();
  });

  it("should keep the public detail anonymous and cookie-free even with an authenticated session", async () => {
    useSessionStore.getState().setSession({
      currentUser: createAuthenticatedUser(),
      tokens: createAuthTokens({ accessToken: "session-access-token" }),
    });
    const fetcher = vi.fn().mockRejectedValue(new TypeError("offline"));
    const adapters = createAppAdapters({ apiOptions: { fetcher }, source: "api" });

    await expect(adapters.publicActivityCatalog.getPublicActivity("activity-1")).rejects.toThrow(
      /conectar/i,
    );

    const requestInit = fetcher.mock.calls[0]?.[1] as RequestInit | undefined;

    expect(new Headers(requestInit?.headers).get("Authorization")).toBeNull();
    expect(requestInit?.credentials).toBe("omit");
  });

  it("should authenticate the administrative user listing with the in-memory session token", async () => {
    useSessionStore.getState().setSession({
      currentUser: createAuthenticatedUser(),
      tokens: createAuthTokens({ accessToken: "session-access-token" }),
    });
    const fetcher = vi.fn().mockRejectedValue(new TypeError("offline"));
    const adapters = createAppAdapters({ apiOptions: { fetcher }, source: "api" });

    await expect(adapters.users.loadUsers()).rejects.toThrow(/conectar/i);

    const requestInit = fetcher.mock.calls[0]?.[1] as RequestInit | undefined;

    expect(new Headers(requestInit?.headers).get("Authorization")).toBe(
      "Bearer session-access-token",
    );
  });

  it("should authenticate the user scope discovery with the in-memory session token", async () => {
    useSessionStore.getState().setSession({
      currentUser: createAuthenticatedUser(),
      tokens: createAuthTokens({ accessToken: "session-access-token" }),
    });
    const fetcher = vi.fn().mockRejectedValue(new TypeError("offline"));
    const adapters = createAppAdapters({ apiOptions: { fetcher }, source: "api" });

    await expect(adapters.userScopes.loadUserScopes()).rejects.toThrow(/conectar/i);

    const requestInit = fetcher.mock.calls[0]?.[1] as RequestInit | undefined;

    expect(new Headers(requestInit?.headers).get("Authorization")).toBe(
      "Bearer session-access-token",
    );
  });

  it("should authenticate the private alert inbox with the in-memory session token", async () => {
    useSessionStore.getState().setSession({
      currentUser: createAuthenticatedUser(),
      tokens: createAuthTokens({ accessToken: "session-access-token" }),
    });
    const fetcher = vi.fn().mockRejectedValue(new TypeError("offline"));
    const adapters = createAppAdapters({ apiOptions: { fetcher }, source: "api" });

    await expect(adapters.alerts.loadAlertsPage({}, 1)).rejects.toThrow(/conectar/i);

    const requestInit = fetcher.mock.calls[0]?.[1] as RequestInit | undefined;

    expect(new Headers(requestInit?.headers).get("Authorization")).toBe(
      "Bearer session-access-token",
    );
  });

  it("should reflect the whole lifecycle across catalog, public detail and availability", async () => {
    useSessionStore.getState().setSession({
      currentUser: createAuthenticatedUser(),
      tokens: createAuthTokens(),
    });
    const adapters = createAppAdapters({ source: "mock" });
    const criteria = { date: "2026-08-24", endTime: "09:00", startTime: "08:00" };
    const availableIds = async () =>
      (await adapters.classrooms.loadAvailableClassrooms!(criteria)).map((room) => room.id);

    const created = await adapters.activities.createActivity({
      classroomId: "aula-10",
      date: "2026-08-24",
      endTime: "09:00",
      eventProgramId: "program-fisc-default",
      maxCapacity: 30,
      name: "Actividad de ciclo",
      startTime: "08:00",
      type: "WORKSHOP",
    });

    const draftCatalog = await adapters.publicActivityCatalog.loadPublicActivities();
    expect(draftCatalog.activities.map((activity) => activity.id)).not.toContain(created.id);
    await expect(adapters.publicActivityCatalog.getPublicActivity(created.id)).resolves.toBeNull();

    const published = await adapters.activities.updateActivity(created.id, {
      status: "SCHEDULED",
    });
    expect(published.status).toBe("SCHEDULED");
    expect(
      (await adapters.publicActivityCatalog.loadPublicActivities()).activities.map((a) => a.id),
    ).toContain(created.id);
    await expect(
      adapters.publicActivityCatalog.getPublicActivity(created.id),
    ).resolves.toMatchObject({ id: created.id });
    expect(await availableIds()).not.toContain("aula-10");

    await adapters.activities.updateActivity(created.id, { status: "DRAFT" });
    expect(
      (await adapters.publicActivityCatalog.loadPublicActivities()).activities.map((a) => a.id),
    ).not.toContain(created.id);
    await expect(adapters.publicActivityCatalog.getPublicActivity(created.id)).resolves.toBeNull();
    expect(await availableIds()).toContain("aula-10");

    await adapters.activities.updateActivity(created.id, { status: "SCHEDULED" });
    expect(
      (await adapters.publicActivityCatalog.loadPublicActivities()).activities.map((a) => a.id),
    ).toContain(created.id);
    expect(await availableIds()).not.toContain("aula-10");

    await adapters.activities.cancelActivity(created.id, { reason: "Motivo de prueba" });
    expect(
      (await adapters.publicActivityCatalog.loadPublicActivities()).activities.map((a) => a.id),
    ).not.toContain(created.id);
    await expect(
      adapters.publicActivityCatalog.getPublicActivity(created.id),
    ).resolves.toMatchObject({ cancelReason: "Motivo de prueba", status: "CANCELLED" });
    expect(await availableIds()).toContain("aula-10");
  });

  it("should not mutate the registry when a publish conflicts", async () => {
    useSessionStore.getState().setSession({
      currentUser: createAuthenticatedUser(),
      tokens: createAuthTokens(),
    });
    const adapters = createAppAdapters({ source: "mock" });
    const input = {
      classroomId: "aula-10",
      date: "2026-08-24",
      endTime: "09:00",
      eventProgramId: "program-fisc-default",
      maxCapacity: 30,
      name: "Solapada",
      startTime: "08:00",
      type: "WORKSHOP" as const,
    };

    const first = await adapters.activities.createActivity(input);
    const second = await adapters.activities.createActivity({ ...input, name: "Segunda" });

    await adapters.activities.updateActivity(first.id, { status: "SCHEDULED" });

    await expect(
      adapters.activities.updateActivity(second.id, { status: "SCHEDULED" }),
    ).rejects.toMatchObject({ status: 409 });
    await expect(adapters.activities.getActivity(second.id)).resolves.toMatchObject({
      status: "DRAFT",
    });
  });

  it("should isolate mutations between compositions", async () => {
    useSessionStore.getState().setSession({
      currentUser: createAuthenticatedUser(),
      tokens: createAuthTokens(),
    });
    const first = createAppAdapters({ source: "mock" });
    const second = createAppAdapters({ source: "mock" });

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

  it("should delete a runtime draft and drop it from every retained reader", async () => {
    useSessionStore.getState().setSession({
      currentUser: createAuthenticatedUser(),
      tokens: createAuthTokens(),
    });
    const adapters = createAppAdapters({ source: "mock" });
    const created = await adapters.activities.createActivity({
      classroomId: "aula-10",
      date: "2026-08-24",
      endTime: "09:00",
      eventProgramId: "program-fisc-default",
      maxCapacity: 30,
      name: "Borrador eliminable",
      startTime: "08:00",
      type: "WORKSHOP",
    });
    const activityScope = { type: "activity" as const, id: created.id };

    await adapters.collaborators.addCollaborator(activityScope, {
      userId: "user-2",
      role: "EDITOR",
    });
    await expect(adapters.collaborators.loadCollaborators(activityScope)).resolves.toHaveLength(1);

    await adapters.activities.deleteActivity(created.id);

    await expect(adapters.activities.getActivity(created.id)).rejects.toMatchObject({
      status: 404,
    });
    const page = await adapters.activities.loadProgramActivitiesPage("program-fisc-default", {}, 1);
    expect(page.items.map((item) => item.id)).not.toContain(created.id);
    const catalog = await adapters.activityCatalog.loadCatalog("all-programs");
    expect(catalog.activities.map((activity) => activity.id)).not.toContain(created.id);
    const scopes = await adapters.userScopes.loadUserScopes();
    expect(scopes.map((scope) => scope.id)).not.toContain(created.id);
    await expect(adapters.collaborators.loadCollaborators(activityScope)).rejects.toMatchObject({
      status: 404,
    });

    const recreated = await adapters.activities.createActivity({
      classroomId: "aula-10",
      date: "2026-08-24",
      endTime: "09:00",
      eventProgramId: "program-fisc-default",
      maxCapacity: 30,
      name: "Borrador posterior",
      startTime: "08:00",
      type: "WORKSHOP",
    });

    expect(recreated.id).not.toBe(created.id);
    await expect(
      adapters.collaborators.loadCollaborators({ type: "activity", id: recreated.id }),
    ).resolves.toEqual([]);
  });

  it("should reject deletion without the effective delete permission", async () => {
    useSessionStore.getState().setSession({
      currentUser: createAuthenticatedUser({ globalRole: "USER" }),
      tokens: createAuthTokens(),
    });
    const adapters = createAppAdapters({ source: "mock" });
    const created = await adapters.activities.createActivity({
      classroomId: "aula-10",
      date: "2026-08-24",
      endTime: "09:00",
      eventProgramId: "program-fisc-default",
      maxCapacity: 30,
      name: "Sin permiso",
      startTime: "08:00",
      type: "WORKSHOP",
    });

    await expect(adapters.activities.deleteActivity(created.id)).rejects.toMatchObject({
      status: 403,
    });
    await expect(adapters.activities.getActivity(created.id)).resolves.toMatchObject({
      id: created.id,
    });
  });

  it("should keep the data of another composition after a deletion", async () => {
    useSessionStore.getState().setSession({
      currentUser: createAuthenticatedUser(),
      tokens: createAuthTokens(),
    });
    const first = createAppAdapters({ source: "mock" });
    const second = createAppAdapters({ source: "mock" });
    const created = await first.activities.createActivity({
      classroomId: "aula-10",
      date: "2026-08-24",
      endTime: "09:00",
      eventProgramId: "program-fisc-default",
      maxCapacity: 30,
      name: "Solo en la primera",
      startTime: "08:00",
      type: "WORKSHOP",
    });

    await first.activities.deleteActivity(created.id);

    await expect(
      second.activities.getActivity("activity-academic-support-ongoing"),
    ).resolves.toMatchObject({ id: "activity-academic-support-ongoing" });
    await expect(second.activities.getActivity(created.id)).rejects.toMatchObject({ status: 404 });
  });
});
