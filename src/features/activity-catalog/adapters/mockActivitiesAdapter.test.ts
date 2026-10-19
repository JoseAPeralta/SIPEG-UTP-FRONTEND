// @vitest-environment node

import { describe, expect, it } from "vitest";

import { ApiError } from "@/app/adapters/http/apiClient";
import { alerts } from "@/data/mock/alerts";
import { createActivity, createEventProgram, createOrganizationalUnit } from "@/test/factories";
import type { Activity, EventProgram } from "@/types/domain";

import { createMockActivitiesAdapter } from "./mockActivitiesAdapter";
import type { MockActivityRegistry } from "./mockActivityRegistry";

function registryOf(activities: Activity[]): MockActivityRegistry {
  return new Map(activities.map((activity) => [activity.id, structuredClone(activity)]));
}

function adapterWith(activities: Activity[] = [], role: "ADMIN" | "USER" | null = "ADMIN") {
  const registry = registryOf(activities);

  return {
    adapter: createMockActivitiesAdapter({
      readEventPrograms: () => Promise.resolve([createEventProgram()]),
      readGlobalRole: () => role ?? undefined,
      readOrganizationalUnits: () => Promise.resolve([createOrganizationalUnit()]),
      registry,
    }),
    registry,
  };
}

type DeleteScenario = {
  canDelete?: (activityId: string) => boolean;
  programStatus?: EventProgram["status"];
  retained?: (activityId: string) => boolean;
  role?: "ADMIN" | "USER" | null;
};

function deletionAdapter(activities: Activity[], options: DeleteScenario = {}) {
  const registry = registryOf(activities);

  return {
    adapter: createMockActivitiesAdapter({
      readCanDeleteActivity: options.canDelete ?? (() => true),
      readEventPrograms: () =>
        Promise.resolve([createEventProgram({ status: options.programStatus ?? "ACTIVE" })]),
      readGlobalRole: () => (options.role === null ? undefined : (options.role ?? "ADMIN")),
      readOrganizationalUnits: () => Promise.resolve([createOrganizationalUnit()]),
      ...(options.retained ? { readRetainedHistory: options.retained } : {}),
      registry,
    }),
    registry,
  };
}

const validClassroomActivity = {
  classroomId: "aula-10",
  date: "2026-08-24",
  endTime: "09:00",
  eventProgramId: "program-1",
  name: "Taller nuevo",
  startTime: "08:00",
  type: "WORKSHOP" as const,
};

describe("createMockActivitiesAdapter", () => {
  it("should filter and paginate the program activities, embedding their references", async () => {
    const { adapter } = adapterWith([
      createActivity({ id: "a-1", date: "2026-08-24", name: "Primera" }),
      createActivity({ id: "a-2", date: "2026-08-25", name: "Segunda", status: "CANCELLED" }),
      createActivity({ id: "a-3", eventProgramId: "program-2", name: "Ajena" }),
    ]);

    const page = await adapter.loadProgramActivitiesPage("program-1", {}, 1);
    expect(page.items.map((item) => item.id)).toEqual(["a-1", "a-2"]);
    expect(page.items[0]?.eventProgram).toEqual({
      id: "program-1",
      label: "Semana de innovacion",
      name: "Semana de Innovacion Academica",
    });
    expect(page.items[0]?.organizationalUnit).toEqual({
      id: "fic",
      name: "Facultad de Ingenieria Civil",
      type: "FACULTY",
    });
    expect(page.items[0]).not.toHaveProperty("equipment");
    expect(page).toMatchObject({ limit: 20, page: 1, total: 2, totalPages: 1 });

    const filtered = await adapter.loadProgramActivitiesPage(
      "program-1",
      { dateFrom: "2026-08-25", status: "CANCELLED" },
      1,
    );
    expect(filtered.items.map((item) => item.id)).toEqual(["a-2"]);

    const searched = await adapter.loadProgramActivitiesPage("program-1", { q: "prim" }, 1);
    expect(searched.items.map((item) => item.id)).toEqual(["a-1"]);
  });

  it("should reject a listing for a missing program and a detail for a missing activity", async () => {
    const { adapter } = adapterWith();

    await expect(adapter.loadProgramActivitiesPage("program-x", {}, 1)).rejects.toMatchObject({
      status: 404,
    });
    await expect(adapter.getActivity("activity-x")).rejects.toMatchObject({ status: 404 });
  });

  it("should require an authenticated session for mutations", async () => {
    const { adapter } = adapterWith([], null);

    await expect(
      adapter.createActivity({ ...validClassroomActivity, eventProgramId: "program-1" }),
    ).rejects.toMatchObject({ status: 401 });
    await expect(adapter.updateActivity("activity-1", { name: "x" })).rejects.toMatchObject({
      status: 401,
    });
  });

  it("should not expose an injected notification property nor fabricate delivery results", async () => {
    const activityId = "activity-open-data-governance";
    const activity = {
      ...createActivity({ id: activityId }),
      notifyAttendees: true,
    } as Activity;
    const { adapter } = adapterWith([activity]);

    expect(
      alerts.some((alert) => alert.target.kind === "ACTIVITY" && alert.target.id === activityId),
    ).toBe(true);

    const detail = await adapter.getActivity(activityId);

    expect(detail).not.toHaveProperty("notifyAttendees");
    expect(detail).not.toHaveProperty("notification");
    expect(JSON.stringify(detail)).not.toMatch(/notific|correo/i);
    expect(detail).toMatchObject({ id: activityId, status: "SCHEDULED" });
  });

  it("should create a draft inside an active program with its inline speakers", async () => {
    const { adapter, registry } = adapterWith();

    const created = await adapter.createActivity({
      ...validClassroomActivity,
      equipment: ["Proyector"],
      maxCapacity: 40,
      speakers: [{ firstName: "Ana", lastName: "Perez" }],
    });

    expect(created).toMatchObject({
      capacity: 40,
      classroom: { id: "aula-10", name: "Aula 10B" },
      equipment: ["Proyector"],
      status: "DRAFT",
    });
    expect(created.speakers).toHaveLength(1);
    expect(registry.get(created.id)?.status).toBe("DRAFT");

    const page = await adapter.loadProgramActivitiesPage("program-1", {}, 1);
    const listed = page.items.find((item) => item.id === created.id);
    expect(listed?.name).toBe("Taller nuevo");
    expect(listed).not.toHaveProperty("equipment");
  });

  it("should only create inside an active program", async () => {
    const registry: MockActivityRegistry = new Map();
    const adapter = createMockActivitiesAdapter({
      readEventPrograms: () =>
        Promise.resolve([createEventProgram({ id: "program-draft", status: "DRAFT" })]),
      readGlobalRole: () => "ADMIN",
      readOrganizationalUnits: () => Promise.resolve([createOrganizationalUnit()]),
      registry,
    });

    await expect(
      adapter.createActivity({ ...validClassroomActivity, eventProgramId: "program-draft" }),
    ).rejects.toMatchObject({ status: 400 });
    await expect(
      adapter.createActivity({ ...validClassroomActivity, eventProgramId: "program-missing" }),
    ).rejects.toMatchObject({ status: 404 });
  });

  it("should reproduce the classroom capacity, window and overlap rules", async () => {
    const { adapter } = adapterWith([
      createActivity({
        classroomId: "aula-10",
        date: "2026-08-24",
        endTime: "08:00",
        id: "reserved",
        startTime: "07:30",
        status: "SCHEDULED",
      }),
    ]);

    await expect(
      adapter.createActivity({ ...validClassroomActivity, classroomId: "classroom-x" }),
    ).rejects.toMatchObject({ status: 404 });
    await expect(
      adapter.createActivity({ ...validClassroomActivity, maxCapacity: 49 }),
    ).rejects.toMatchObject({ status: 400 });
    await expect(
      adapter.createActivity({ ...validClassroomActivity, startTime: "06:00", endTime: "07:00" }),
    ).rejects.toMatchObject({ status: 409 });
    await expect(
      adapter.createActivity({ ...validClassroomActivity, startTime: "07:45", endTime: "08:30" }),
    ).rejects.toMatchObject({ status: 409 });

    const adjacent = await adapter.createActivity(validClassroomActivity);
    expect(adjacent.status).toBe("DRAFT");
  });

  it("should reject editing an activity whose effective status is not editable", async () => {
    const { adapter } = adapterWith([
      createActivity({ id: "ongoing", status: "ONGOING" }),
      createActivity({ id: "completed", status: "COMPLETED" }),
      createActivity({ id: "cancelled", status: "CANCELLED" }),
    ]);

    for (const id of ["ongoing", "completed", "cancelled"]) {
      await expect(adapter.updateActivity(id, { name: "x" })).rejects.toMatchObject({
        status: 409,
      });
    }
  });

  it("should exclude the edited activity itself from the overlap validation", async () => {
    const { adapter } = adapterWith([
      createActivity({
        capacity: 30,
        classroomId: "aula-10",
        date: "2026-08-24",
        endTime: "09:00",
        id: "scheduled",
        startTime: "08:00",
        status: "SCHEDULED",
      }),
    ]);

    const updated = await adapter.updateActivity("scheduled", { name: "Renombrada" });
    expect(updated.name).toBe("Renombrada");
  });

  it("should clear the classroom, replace speakers and validate the new reservation", async () => {
    const { adapter } = adapterWith([
      createActivity({
        classroomId: "aula-10",
        date: "2026-08-24",
        endTime: "09:00",
        id: "scheduled",
        speakers: [{ firstName: "Ana", id: "speaker-1", lastName: "Perez" }],
        startTime: "08:00",
        status: "SCHEDULED",
      }),
      createActivity({
        classroomId: "aula-10",
        date: "2026-08-24",
        endTime: "08:30",
        id: "other",
        startTime: "08:00",
        status: "SCHEDULED",
      }),
    ]);

    const cleared = await adapter.updateActivity("scheduled", { classroomId: null });
    expect(cleared.classroom).toBeNull();

    const updated = await adapter.updateActivity("scheduled", {
      speakers: [{ email: null, firstName: "Luis", lastName: "Gomez", organization: null }],
    });
    expect(updated.speakers).toEqual([
      { firstName: "Luis", id: "speaker-updated-scheduled-1", lastName: "Gomez" },
    ]);

    await expect(
      adapter.updateActivity("scheduled", {
        classroomId: "aula-10",
        date: "2026-08-24",
        endTime: "08:30",
        startTime: "08:00",
      }),
    ).rejects.toMatchObject({ status: 409 });
  });

  it("should verify the classroom only when publishing, not on a pure unpublish", async () => {
    const { adapter } = adapterWith([
      createActivity({
        classroomId: "aula-10",
        date: "2026-08-24",
        endTime: "07:00",
        id: "draft",
        startTime: "06:00",
        status: "DRAFT",
      }),
      createActivity({
        classroomId: "aula-10",
        date: "2026-08-24",
        endTime: "07:00",
        id: "scheduled",
        startTime: "06:00",
        status: "SCHEDULED",
      }),
    ]);

    await expect(adapter.updateActivity("draft", { status: "SCHEDULED" })).rejects.toMatchObject({
      status: 409,
    });

    const unpublished = await adapter.updateActivity("scheduled", { status: "DRAFT" });
    expect(unpublished.status).toBe("DRAFT");
    expect(unpublished.classroom).toMatchObject({ id: "aula-10" });
  });

  it("should preserve classroom, speakers, equipment and counters on a pure unpublish", async () => {
    const { adapter } = adapterWith([
      createActivity({
        capacity: 30,
        checkedInCount: 5,
        classroomId: "aula-10",
        date: "2026-08-24",
        endTime: "09:00",
        enrolledCount: 12,
        equipment: ["Proyector"],
        id: "scheduled",
        speakers: [{ firstName: "Ana", id: "s-1", lastName: "Perez" }],
        startTime: "08:00",
        status: "SCHEDULED",
      }),
    ]);

    const detail = await adapter.updateActivity("scheduled", { status: "DRAFT" });

    expect(detail).toMatchObject({
      capacity: 30,
      checkedInCount: 5,
      classroom: { id: "aula-10" },
      enrolledCount: 12,
      equipment: ["Proyector"],
      status: "DRAFT",
    });
    expect(detail.speakers).toHaveLength(1);
  });

  it("should require a session and existing activity and program to cancel", async () => {
    const { adapter } = adapterWith([createActivity({ id: "a-1" })], null);
    await expect(adapter.cancelActivity("a-1", {})).rejects.toMatchObject({ status: 401 });

    const { adapter: authorized } = adapterWith([
      createActivity({ eventProgramId: "program-missing", id: "a-2" }),
    ]);
    await expect(authorized.cancelActivity("missing", {})).rejects.toMatchObject({ status: 404 });
    await expect(authorized.cancelActivity("a-2", {})).rejects.toMatchObject({ status: 404 });
  });

  it("should reject cancelling a completed activity and an inactive program", async () => {
    const { adapter } = adapterWith([createActivity({ id: "completed", status: "COMPLETED" })]);
    await expect(adapter.cancelActivity("completed", {})).rejects.toMatchObject({ status: 409 });

    const registry: MockActivityRegistry = new Map([
      ["a-3", createActivity({ eventProgramId: "program-draft", id: "a-3" })],
    ]);
    const inactive = createMockActivitiesAdapter({
      readEventPrograms: () =>
        Promise.resolve([createEventProgram({ id: "program-draft", status: "DRAFT" })]),
      readGlobalRole: () => "ADMIN",
      readOrganizationalUnits: () => Promise.resolve([createOrganizationalUnit()]),
      registry,
    });
    await expect(inactive.cancelActivity("a-3", {})).rejects.toMatchObject({ status: 409 });
  });

  it("should cancel normalizing the reason and keeping the original on a second call", async () => {
    const { adapter, registry } = adapterWith([createActivity({ id: "a-1" })]);

    const first = await adapter.cancelActivity("a-1", { reason: "  Sin luz  " });
    expect(first).toMatchObject({ cancelReason: "Sin luz", status: "CANCELLED" });
    expect(registry.get("a-1")?.status).toBe("CANCELLED");

    const second = await adapter.cancelActivity("a-1", { reason: "Otro motivo" });
    expect(second.cancelReason).toBe("Sin luz");
  });

  it("should cancel without a reason storing null", async () => {
    const { adapter } = adapterWith([createActivity({ id: "a-1" })]);

    const detail = await adapter.cancelActivity("a-1", {});
    expect(detail).toMatchObject({ cancelReason: null, status: "CANCELLED" });
  });

  it("should not mutate the registry when a publish is rejected", async () => {
    const { adapter, registry } = adapterWith([
      createActivity({
        classroomId: "aula-10",
        date: "2026-08-24",
        endTime: "07:00",
        id: "draft",
        startTime: "06:00",
        status: "DRAFT",
      }),
    ]);

    await expect(adapter.updateActivity("draft", { status: "SCHEDULED" })).rejects.toMatchObject({
      status: 409,
    });
    expect(registry.get("draft")?.status).toBe("DRAFT");
  });
});

describe("deleteActivity", () => {
  it("deletes a draft without retained history from an active program", async () => {
    const { adapter, registry } = deletionAdapter([
      createActivity({ id: "draft-1", status: "DRAFT" }),
    ]);

    await adapter.deleteActivity("draft-1");

    expect(registry.has("draft-1")).toBe(false);
    await expect(adapter.getActivity("draft-1")).rejects.toMatchObject({ status: 404 });
    const page = await adapter.loadProgramActivitiesPage("program-1", {}, 1);
    expect(page.items.map((item) => item.id)).not.toContain("draft-1");
  });

  it("requires an authenticated session", async () => {
    const { adapter, registry } = deletionAdapter(
      [createActivity({ id: "draft-1", status: "DRAFT" })],
      { role: null },
    );

    await expect(adapter.deleteActivity("draft-1")).rejects.toMatchObject({ status: 401 });
    expect(registry.has("draft-1")).toBe(true);
  });

  it("rejects an actor without the effective delete permission", async () => {
    const { adapter, registry } = deletionAdapter(
      [createActivity({ id: "draft-1", status: "DRAFT" })],
      { canDelete: () => false },
    );

    await expect(adapter.deleteActivity("draft-1")).rejects.toMatchObject({ status: 403 });
    expect(registry.has("draft-1")).toBe(true);
  });

  it("rejects a missing activity", async () => {
    const { adapter } = deletionAdapter([]);

    await expect(adapter.deleteActivity("missing")).rejects.toMatchObject({ status: 404 });
  });

  it("rejects a non-draft activity keeping the registry intact", async () => {
    const { adapter, registry } = deletionAdapter([
      createActivity({ id: "scheduled", status: "SCHEDULED" }),
    ]);

    await expect(adapter.deleteActivity("scheduled")).rejects.toMatchObject({ status: 409 });
    expect(registry.get("scheduled")?.status).toBe("SCHEDULED");
  });

  it("rejects a draft whose program is not active", async () => {
    const { adapter, registry } = deletionAdapter(
      [createActivity({ id: "draft-1", status: "DRAFT" })],
      { programStatus: "ARCHIVED" },
    );

    await expect(adapter.deleteActivity("draft-1")).rejects.toMatchObject({ status: 409 });
    expect(registry.has("draft-1")).toBe(true);
  });

  it("blocks a draft with attendance even when the record is not present", async () => {
    const { adapter, registry } = deletionAdapter([
      createActivity({ id: "activity-bridge-resilience", status: "DRAFT" }),
    ]);

    await expect(adapter.deleteActivity("activity-bridge-resilience")).rejects.toMatchObject({
      status: 409,
    });
    expect(registry.has("activity-bridge-resilience")).toBe(true);
  });

  it("blocks a draft with an already read alert", async () => {
    const { adapter, registry } = deletionAdapter([
      createActivity({ id: "activity-open-data-governance", status: "DRAFT" }),
    ]);

    await expect(adapter.deleteActivity("activity-open-data-governance")).rejects.toMatchObject({
      status: 409,
    });
    expect(registry.has("activity-open-data-governance")).toBe(true);
  });

  it("does not block on the retained history of another activity", async () => {
    const { adapter, registry } = deletionAdapter([
      createActivity({ id: "draft-1", status: "DRAFT" }),
      createActivity({ id: "activity-bridge-resilience", status: "SCHEDULED" }),
    ]);

    await adapter.deleteActivity("draft-1");

    expect(registry.has("draft-1")).toBe(false);
    expect(registry.has("activity-bridge-resilience")).toBe(true);
  });

  it("does not reuse a created id after deleting it", async () => {
    const { adapter } = deletionAdapter([]);

    const first = await adapter.createActivity({
      ...validClassroomActivity,
      eventProgramId: "program-1",
    });
    await adapter.deleteActivity(first.id);
    const second = await adapter.createActivity({
      ...validClassroomActivity,
      eventProgramId: "program-1",
    });

    expect(second.id).not.toBe(first.id);
  });
});

describe("ApiError classification", () => {
  it("should expose the documented status on rejections", async () => {
    const { adapter } = adapterWith();

    await adapter.getActivity("missing").catch((error: unknown) => {
      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).status).toBe(404);
    });
  });
});
