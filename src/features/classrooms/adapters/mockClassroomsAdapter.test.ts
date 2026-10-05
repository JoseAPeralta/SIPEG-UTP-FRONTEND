import { describe, expect, it } from "vitest";

import { ApiError } from "@/app/adapters/http/apiClient";
import { createActivity } from "@/test/factories";

import { createMockClassroomsAdapter } from "./mockClassroomsAdapter";

async function statusOf(run: () => Promise<unknown>): Promise<number> {
  try {
    await run();
  } catch (error) {
    if (error instanceof ApiError) return error.status;
    throw error;
  }

  throw new Error("se esperaba un rechazo");
}

describe("createMockClassroomsAdapter", () => {
  it("should return independent copies", async () => {
    const adapter = createMockClassroomsAdapter();
    const first = await adapter.loadClassrooms();
    const second = await adapter.loadClassrooms();
    const originalName = second[0]?.name;

    if (first[0]) first[0].name = "Mutada";

    expect(second[0]?.name).toBe(originalName);
  });

  it("should list only active classrooms by default", async () => {
    const adapter = createMockClassroomsAdapter();

    expect((await adapter.loadClassrooms()).every((classroom) => classroom.isActive)).toBe(true);
  });

  it("should apply the contract filters", async () => {
    const adapter = createMockClassroomsAdapter();

    const laboratories = await adapter.loadClassrooms({ type: "LABORATORY" });
    const roomy = await adapter.loadClassrooms({ minCapacity: 100 });
    const projected = await adapter.loadClassrooms({ amenity: "projector" });

    expect(laboratories.map((classroom) => classroom.type)).toEqual(["LABORATORY"]);
    expect(roomy.every((classroom) => classroom.capacity >= 100)).toBe(true);
    expect(projected.every((classroom) => classroom.amenities.includes("projector"))).toBe(true);
  });

  it("should return only rooms whose complete weekly window and filters fit the request", async () => {
    const adapter = createMockClassroomsAdapter();

    const available = await adapter.loadAvailableClassrooms!({
      amenity: "projector",
      date: "2026-08-24",
      endTime: "09:00",
      minCapacity: 35,
      startTime: "08:00",
      type: "CLASSROOM",
    });

    expect(available.map((classroom) => classroom.id)).toEqual(["auditorium-01"]);
  });

  it("should exclude occupied rooms while keeping an adjacent interval available", async () => {
    const adapter = createMockClassroomsAdapter();

    const occupied = await adapter.loadAvailableClassrooms!({
      date: "2026-07-09",
      endTime: "09:30",
      startTime: "09:00",
    });
    const adjacent = await adapter.loadAvailableClassrooms!({
      date: "2026-08-03",
      endTime: "14:00",
      startTime: "12:00",
    });

    expect(occupied.map((classroom) => classroom.id)).not.toContain("aula-10");
    expect(adjacent.map((classroom) => classroom.id)).toContain("lab-01");
  });

  it("should block only scheduled or ongoing activities", async () => {
    const criteria = { date: "2026-08-03", endTime: "09:00", startTime: "08:00" };
    const scheduled = createMockClassroomsAdapter({
      activities: [
        createActivity({
          classroomId: "lab-01",
          date: criteria.date,
          endTime: "09:00",
          startTime: "08:30",
          status: "SCHEDULED",
        }),
      ],
    });
    const completed = createMockClassroomsAdapter({
      activities: [
        createActivity({
          classroomId: "lab-01",
          date: criteria.date,
          endTime: "09:00",
          startTime: "08:30",
          status: "COMPLETED",
        }),
      ],
    });

    expect(
      (await scheduled.loadAvailableClassrooms!(criteria)).map((room) => room.id),
    ).not.toContain("lab-01");
    expect((await completed.loadAvailableClassrooms!(criteria)).map((room) => room.id)).toContain(
      "lab-01",
    );
  });

  it("should return inactive classrooms only when asked for them", async () => {
    const adapter = createMockClassroomsAdapter();
    const created = await adapter.createClassroom!({
      building: null,
      capacity: 30,
      floor: null,
      name: "Aula nueva",
      type: "CLASSROOM",
    });
    const idsOf = async (filters?: Parameters<typeof adapter.loadClassrooms>[0]) =>
      (await adapter.loadClassrooms(filters)).map((classroom) => classroom.id);

    expect(await idsOf()).toContain(created.id);
    expect(await idsOf({ isActive: "active" })).toContain(created.id);
    expect(await idsOf({ isActive: "inactive" })).not.toContain(created.id);

    await adapter.updateClassroom!(created.id, { isActive: false });

    expect(await idsOf()).not.toContain(created.id);
    expect(await idsOf({ isActive: "active" })).not.toContain(created.id);
    expect(await idsOf({ isActive: "inactive" })).toEqual([created.id]);
    expect(await idsOf({ isActive: "all" })).toContain(created.id);
  });

  it("should reject deactivating a classroom reserved by scheduled activities", async () => {
    const adapter = createMockClassroomsAdapter();

    expect(await statusOf(() => adapter.updateClassroom!("aula-10", { isActive: false }))).toBe(
      409,
    );

    const created = await adapter.createClassroom!({
      building: null,
      capacity: 30,
      floor: null,
      name: "Aula libre",
      type: "CLASSROOM",
    });

    await expect(adapter.updateClassroom!(created.id, { isActive: false })).resolves.toMatchObject({
      isActive: false,
    });
  });

  it("should reject a duplicated amenity regardless of case and remove an absent one as 404", async () => {
    const adapter = createMockClassroomsAdapter();
    const detail = await adapter.getClassroom!("aula-10");

    expect(await statusOf(() => adapter.addClassroomAmenity!("aula-10", "WHITEBOARD"))).toBe(409);

    const added = await adapter.addClassroomAmenity!("aula-10", "mesa-reglable");
    expect(added.amenities).toContain("mesa-reglable");
    const removed = await adapter.removeClassroomAmenity!("aula-10", "Mesa-Reglable");
    expect(removed.amenities).not.toContain("mesa-reglable");
    expect(removed.amenities).toContain("whiteboard");
    expect(detail.amenities).toContain("whiteboard");
    expect(await statusOf(() => adapter.removeClassroomAmenity!("aula-10", "ninguna"))).toBe(404);
  });

  it("should reject an inverted window, allow an adjacent one and reject an overlapping one", async () => {
    const adapter = createMockClassroomsAdapter();

    expect(
      await statusOf(() =>
        adapter.addClassroomAvailability!("aula-10", {
          dayOfWeek: 1,
          endTime: "08:00",
          period: null,
          startTime: "10:00",
        }),
      ),
    ).toBe(400);

    // Adyacente: termina donde la siguiente empieza, asi que no se solapa.
    const adjacent = await adapter.addClassroomAvailability!("aula-10", {
      dayOfWeek: 1,
      endTime: "10:00",
      period: null,
      startTime: "09:00",
    });
    expect(adjacent.availability.map((window) => window.startTime)).toContain("09:00");

    expect(
      await statusOf(() =>
        adapter.addClassroomAvailability!("aula-10", {
          dayOfWeek: 1,
          endTime: "11:00",
          period: null,
          startTime: "09:30",
        }),
      ),
    ).toBe(409);
  });

  it("should keep windows on different ISO days independent", async () => {
    const adapter = createMockClassroomsAdapter();

    // El lunes ya tiene 07:00-09:00; el mismo tramo un martes no se solapa con nada.
    const tuesday = await adapter.addClassroomAvailability!("aula-10", {
      dayOfWeek: 2,
      endTime: "09:00",
      period: null,
      startTime: "07:00",
    });
    expect(tuesday.availability.filter((window) => window.dayOfWeek === 2)).toHaveLength(1);
  });

  it("should remove an availability window by id and report an unknown one as 404", async () => {
    const adapter = createMockClassroomsAdapter();
    const detail = await adapter.getClassroom!("aula-10");
    const window = detail.availability[0];

    if (!window) throw new Error("el mock debe sembrar disponibilidad semanal");

    const remaining = await adapter.removeClassroomAvailability!("aula-10", window.id);
    expect(remaining.availability.map((candidate) => candidate.id)).not.toContain(window.id);
    expect(await statusOf(() => adapter.removeClassroomAvailability!("aula-10", "nope"))).toBe(404);
  });
});
