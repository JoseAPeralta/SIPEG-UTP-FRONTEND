// @vitest-environment node

import { describe, expect, it } from "vitest";

import {
  ActivityCatalogMappingError,
  mapActivity,
  mapActivityId,
  mapEventProgram,
  readPaginatedPage,
} from "./activityCatalogMapper";

const programPayload = {
  bannerUrl: null,
  description: null,
  endDate: "2026-06-19",
  id: "program-1",
  isDefault: false,
  label: "Semana de innovacion",
  name: "Semana de Innovacion Academica",
  organizationalUnit: { id: "fic", name: "Facultad de Ingenieria Civil", type: "FACULTY" },
  startDate: "2026-06-15",
  status: "ACTIVE",
};

const activityPayload = {
  bannerUrl: null,
  cancelReason: null,
  capacity: 40,
  checkedInCount: 3,
  classroom: { building: "Edificio de Aulas", id: "classroom-1", name: "Aula 101" },
  date: "2026-06-15",
  description: "Actividad de prueba",
  endTime: "11:00",
  enrolledCount: 20,
  equipment: ["Proyector"],
  eventProgram: { id: "program-1", label: "Semana de innovacion", name: "Semana" },
  id: "activity-1",
  name: "Actividad de prueba",
  organizationalUnit: { id: "fic", name: "Facultad de Ingenieria Civil", type: "FACULTY" },
  speakers: [{ firstName: "Ana", id: "speaker-1", lastName: "Perez" }],
  startTime: "09:00",
  status: "SCHEDULED",
  type: "TALK",
};

describe("readPaginatedPage", () => {
  it("should read items and total pages from a valid envelope", () => {
    const payload = {
      data: { items: [programPayload], limit: 20, page: 1, total: 1, totalPages: 3 },
      message: "ok",
      success: true,
    };

    expect(readPaginatedPage(payload, "programs")).toEqual({
      items: [programPayload],
      totalPages: 3,
    });
  });

  it("should reject payloads without the paginated envelope", () => {
    expect(() => readPaginatedPage({ items: [] }, "programs")).toThrow(ActivityCatalogMappingError);
    expect(() => readPaginatedPage(null, "programs")).toThrow(/programs/);
  });
});

describe("mapActivityId", () => {
  it("should read the activity identifier from a list item", () => {
    expect(mapActivityId({ id: "activity-1" })).toBe("activity-1");
  });

  it("should reject list items without an identifier", () => {
    expect(() => mapActivityId({ id: "" })).toThrow(/id/);
  });
});

describe("mapEventProgram", () => {
  it("should resolve the owning unit from the nested object", () => {
    expect(mapEventProgram(programPayload)).toMatchObject({
      id: "program-1",
      organizationalUnitId: "fic",
      status: "ACTIVE",
    });
  });

  it("should accept default programs without dates", () => {
    expect(mapEventProgram({ ...programPayload, endDate: null, startDate: null })).toMatchObject({
      endDate: null,
      startDate: null,
    });
  });

  it("should reject unknown program statuses", () => {
    expect(() => mapEventProgram({ ...programPayload, status: "PAUSED" })).toThrow(/status/);
  });
});

describe("mapActivity", () => {
  it("should map a contract activity detail", () => {
    expect(mapActivity(activityPayload)).toEqual({
      bannerUrl: null,
      cancelReason: null,
      capacity: 40,
      checkedInCount: 3,
      classroomId: "classroom-1",
      date: "2026-06-15",
      description: "Actividad de prueba",
      endTime: "11:00",
      enrolledCount: 20,
      equipment: ["Proyector"],
      eventProgramId: "program-1",
      id: "activity-1",
      name: "Actividad de prueba",
      speakers: [{ firstName: "Ana", id: "speaker-1", lastName: "Perez" }],
      startTime: "09:00",
      status: "SCHEDULED",
      type: "TALK",
    });
  });

  it("should keep a null classroom and null description", () => {
    const mapped = mapActivity({ ...activityPayload, classroom: null, description: null });

    expect(mapped.classroomId).toBeNull();
    expect(mapped.description).toBeNull();
  });

  it("should accept every activity type allowed by the contract", () => {
    const allowedTypes = [
      "WORKSHOP",
      "SEMINAR",
      "TALK",
      "CONFERENCE",
      "PANEL",
      "COURSE",
      "COMPETITION",
      "OTHER",
    ] as const;

    allowedTypes.forEach((type) => {
      expect(mapActivity({ ...activityPayload, type }).type).toBe(type);
    });
  });

  it("should reject activity types outside the contract", () => {
    expect(() => mapActivity({ ...activityPayload, type: "FESTIVAL" })).toThrow(/type/);
  });

  it("should reject activities without an event program reference", () => {
    expect(() => mapActivity({ ...activityPayload, eventProgram: { id: "" } })).toThrow(
      /eventProgram/,
    );
  });
});
