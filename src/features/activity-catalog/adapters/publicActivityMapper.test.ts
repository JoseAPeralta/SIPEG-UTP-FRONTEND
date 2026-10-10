// @vitest-environment node

import { describe, expect, it } from "vitest";

import {
  PublicActivityMappingError,
  mapPublicActivity,
  mapPublicActivityCatalog,
} from "./publicActivityMapper";

const activityPayload = {
  bannerUrl: null,
  capacity: 24,
  classroom: { building: "Edificio 2", id: "classroom-1", name: "Laboratorio de Electronica" },
  date: "2026-10-12",
  description: "Taller practico",
  endTime: "12:00",
  eventProgram: { id: "program-1", label: "Semana de innovacion", name: "Semana de Innovacion" },
  id: "activity-1",
  name: "Actividad publica",
  organizationalUnit: { id: "fic", name: "Facultad de Ingenieria Civil", type: "FACULTY" },
  speakers: [{ firstName: "Ana", id: "speaker-1", lastName: "Perez" }],
  startTime: "09:00",
  status: "SCHEDULED",
  type: "WORKSHOP",
};

describe("mapPublicActivity", () => {
  it("should map a published activity and keep its embedded references", () => {
    expect(mapPublicActivity(activityPayload)).toEqual({
      bannerUrl: null,
      capacity: 24,
      classroom: { building: "Edificio 2", id: "classroom-1", name: "Laboratorio de Electronica" },
      date: "2026-10-12",
      description: "Taller practico",
      endTime: "12:00",
      id: "activity-1",
      name: "Actividad publica",
      program: {
        id: "program-1",
        isDefault: false,
        label: "Semana de innovacion",
        name: "Semana de Innovacion",
      },
      speakers: [{ firstName: "Ana", id: "speaker-1", lastName: "Perez" }],
      startTime: "09:00",
      status: "SCHEDULED",
      type: "WORKSHOP",
      unit: { backendId: "fic", name: "Facultad de Ingenieria Civil", type: "FACULTY" },
    });
  });

  it.each(["SCHEDULED", "ONGOING", "COMPLETED"])("should accept the public status %s", (status) => {
    expect(mapPublicActivity({ ...activityPayload, status }).status).toBe(status);
  });

  it.each(["DRAFT", "CANCELLED"])("should reject the administrative status %s", (status) => {
    expect(() => mapPublicActivity({ ...activityPayload, status })).toThrow(
      PublicActivityMappingError,
    );
    expect(() => mapPublicActivity({ ...activityPayload, status })).toThrow(/status/);
  });

  it("should reject a missing status", () => {
    const withoutStatus: Record<string, unknown> = { ...activityPayload };
    delete withoutStatus["status"];

    expect(() => mapPublicActivity(withoutStatus)).toThrow(/status/);
  });

  it("should reject a status outside the contract", () => {
    expect(() => mapPublicActivity({ ...activityPayload, status: "RESCHEDULED" })).toThrow(
      /status/,
    );
  });

  it("should not expose administrative fields present in the payload", () => {
    const mapped = mapPublicActivity({
      ...activityPayload,
      cancelReason: "Cancelada por lluvia",
      checkedInCount: 3,
      enrolledCount: 12,
      equipment: ["Proyector"],
    });

    expect(Object.keys(mapped)).not.toContain("equipment");
    expect(Object.keys(mapped)).not.toContain("enrolledCount");
    expect(Object.keys(mapped)).not.toContain("checkedInCount");
    expect(Object.keys(mapped)).not.toContain("cancelReason");
  });
});

describe("mapPublicActivityCatalog", () => {
  it("should map every item of a valid envelope with its status", () => {
    const catalog = mapPublicActivityCatalog({
      data: {
        items: [activityPayload, { ...activityPayload, id: "activity-2", status: "COMPLETED" }],
        limit: 50,
        page: 1,
        total: 2,
        totalPages: 1,
      },
      message: "ok",
      success: true,
    });

    expect(catalog.activities.map((activity) => activity.status)).toEqual([
      "SCHEDULED",
      "COMPLETED",
    ]);
    expect(catalog.total).toBe(2);
    expect(catalog.totalPages).toBe(1);
  });

  it("should fail when the envelope is invalid", () => {
    expect(() => mapPublicActivityCatalog(null)).toThrow(PublicActivityMappingError);
    expect(() => mapPublicActivityCatalog({ data: null })).toThrow(/data/);
    expect(() => mapPublicActivityCatalog({ data: { items: "nope" } })).toThrow(/items/);
  });
});
