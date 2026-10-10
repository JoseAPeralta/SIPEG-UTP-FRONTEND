// @vitest-environment node

import { describe, expect, it } from "vitest";

import { PublicActivityMappingError } from "./publicActivityMapper";
import { mapPublicActivityDetail } from "./publicActivityDetailMapper";

const detailPayload = {
  bannerUrl: null,
  cancelReason: null,
  capacity: 24,
  checkedInCount: 3,
  classroom: { building: "Edificio 2", id: "classroom-1", name: "Laboratorio de Electronica" },
  date: "2026-10-12",
  description: "Taller practico",
  endTime: "12:00",
  enrolledCount: 18,
  equipment: ["Proyector", "Audio"],
  eventProgram: { id: "program-1", label: "Semana de innovacion", name: "Semana de Innovacion" },
  id: "activity-1",
  name: "Actividad publica",
  organizationalUnit: { id: "fic", name: "Facultad de Ingenieria Civil", type: "FACULTY" },
  speakers: [{ firstName: "Ana", id: "speaker-1", lastName: "Perez" }],
  startTime: "09:00",
  status: "SCHEDULED",
  type: "WORKSHOP",
};

function without(...fields: string[]): Record<string, unknown> {
  const payload: Record<string, unknown> = { ...detailPayload };

  for (const field of fields) {
    delete payload[field];
  }

  return payload;
}

describe("mapPublicActivityDetail", () => {
  it("should map the detail with its cancellation reason and enrolled count", () => {
    expect(mapPublicActivityDetail(detailPayload)).toEqual({
      bannerUrl: null,
      cancelReason: null,
      capacity: 24,
      classroom: { building: "Edificio 2", id: "classroom-1", name: "Laboratorio de Electronica" },
      date: "2026-10-12",
      description: "Taller practico",
      endTime: "12:00",
      enrolledCount: 18,
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

  it("should keep null optionals and an empty speaker list", () => {
    const mapped = mapPublicActivityDetail({
      ...detailPayload,
      bannerUrl: null,
      capacity: null,
      classroom: null,
      description: null,
      speakers: [],
    });

    expect(mapped.bannerUrl).toBeNull();
    expect(mapped.capacity).toBeNull();
    expect(mapped.classroom).toBeNull();
    expect(mapped.description).toBeNull();
    expect(mapped.speakers).toEqual([]);
  });

  it.each(["SCHEDULED", "ONGOING", "COMPLETED"])("should accept the public status %s", (status) => {
    expect(mapPublicActivityDetail({ ...detailPayload, status }).status).toBe(status);
  });

  it("should accept CANCELLED together with its cancellation reason", () => {
    const mapped = mapPublicActivityDetail({
      ...detailPayload,
      cancelReason: "Cancelada por lluvia",
      status: "CANCELLED",
    });

    expect(mapped.status).toBe("CANCELLED");
    expect(mapped.cancelReason).toBe("Cancelada por lluvia");
  });

  it("should reject DRAFT as contract drift instead of degrading it to null", () => {
    expect(() => mapPublicActivityDetail({ ...detailPayload, status: "DRAFT" })).toThrow(
      PublicActivityMappingError,
    );
    expect(() => mapPublicActivityDetail({ ...detailPayload, status: "DRAFT" })).toThrow(/status/);
  });

  it("should reject a status outside the contract", () => {
    expect(() => mapPublicActivityDetail({ ...detailPayload, status: "RESCHEDULED" })).toThrow(
      /status/,
    );
  });

  it("should reject a type outside the contract", () => {
    expect(() => mapPublicActivityDetail({ ...detailPayload, type: "FESTIVAL" })).toThrow(/type/);
  });

  it("should reject an unknown organizational unit type", () => {
    expect(() =>
      mapPublicActivityDetail({
        ...detailPayload,
        organizationalUnit: { id: "fic", name: "Facultad", type: "CAMPUS" },
      }),
    ).toThrow(/organizationalUnit\.type/);
  });

  it.each([
    "id",
    "name",
    "date",
    "startTime",
    "endTime",
    "type",
    "status",
    "cancelReason",
    "speakers",
    "eventProgram",
    "organizationalUnit",
    "enrolledCount",
    "checkedInCount",
    "equipment",
  ])("should reject a detail without the required field %s", (field) => {
    expect(() => mapPublicActivityDetail(without(field))).toThrow(PublicActivityMappingError);
  });

  it("should validate checkedInCount without exposing it", () => {
    expect(() => mapPublicActivityDetail({ ...detailPayload, checkedInCount: "3" })).toThrow(
      /checkedInCount/,
    );
  });

  it("should validate equipment elements without exposing them", () => {
    expect(() => mapPublicActivityDetail({ ...detailPayload, equipment: "Proyector" })).toThrow(
      /equipment/,
    );
    expect(() =>
      mapPublicActivityDetail({ ...detailPayload, equipment: ["Proyector", 7] }),
    ).toThrow(/equipment\[1\]/);
  });

  it("should reject a cancellation reason that is not text or null", () => {
    expect(() => mapPublicActivityDetail({ ...detailPayload, cancelReason: 7 })).toThrow(
      /cancelReason/,
    );
  });

  it("should not incorporate equipment or checkedInCount in the read model", () => {
    const mapped = mapPublicActivityDetail(detailPayload);
    const keys = Object.keys(mapped);

    expect(keys).not.toContain("equipment");
    expect(keys).not.toContain("checkedInCount");
    expect(keys).toContain("cancelReason");
    expect(keys).toContain("enrolledCount");
  });
});
