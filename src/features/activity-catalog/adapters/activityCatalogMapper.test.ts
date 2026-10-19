// @vitest-environment node

import { describe, expect, it } from "vitest";

import { readCatalogActivitiesPage } from "./activityCatalogMapper";
import { ActivityAdministrationMappingError } from "./administrativeActivityMapper";

const activityItem = {
  bannerUrl: null,
  capacity: 40,
  classroom: { building: "Edificio de Aulas", id: "classroom-1", name: "Aula 101" },
  date: "2026-06-15",
  description: "Actividad de prueba",
  endTime: "11:00",
  eventProgram: { id: "program-1", label: "Semana de innovacion", name: "Semana" },
  id: "activity-1",
  name: "Actividad de prueba",
  organizationalUnit: { id: "fic", name: "Facultad de Ingenieria Civil", type: "FACULTY" },
  speakers: [{ firstName: "Ana", id: "speaker-1", lastName: "Perez" }],
  startTime: "09:00",
  status: "SCHEDULED",
  type: "TALK",
};

function envelope(items: unknown[], totalPages = 1, page = 1) {
  return {
    data: { items, limit: 50, page, total: items.length, totalPages },
    message: "ok",
    success: true,
  };
}

describe("readCatalogActivitiesPage", () => {
  it("should project each item to the listing summary", () => {
    const page = readCatalogActivitiesPage(envelope([activityItem]), "catalog");

    expect(page.totalPages).toBe(1);
    expect(page.items).toEqual([
      {
        bannerUrl: null,
        capacity: 40,
        classroomId: "classroom-1",
        date: "2026-06-15",
        description: "Actividad de prueba",
        endTime: "11:00",
        eventProgramId: "program-1",
        id: "activity-1",
        name: "Actividad de prueba",
        speakers: [{ firstName: "Ana", id: "speaker-1", lastName: "Perez" }],
        startTime: "09:00",
        status: "SCHEDULED",
        type: "TALK",
      },
    ]);
  });

  it("should drop detail fields injected in a list item", () => {
    const page = readCatalogActivitiesPage(
      envelope([
        {
          ...activityItem,
          cancelReason: "Cancelada",
          checkedInCount: 3,
          enrolledCount: 20,
          equipment: ["Proyector"],
        },
      ]),
      "catalog",
    );

    for (const field of ["cancelReason", "checkedInCount", "enrolledCount", "equipment"]) {
      expect(page.items[0]).not.toHaveProperty(field);
    }
  });

  it("should keep a null classroom reference", () => {
    const page = readCatalogActivitiesPage(
      envelope([{ ...activityItem, classroom: null }]),
      "catalog",
    );

    expect(page.items[0]?.classroomId).toBeNull();
  });

  it("should reject payloads outside the contract", () => {
    expect(() => readCatalogActivitiesPage({ items: [] }, "catalog")).toThrow(
      ActivityAdministrationMappingError,
    );
    expect(() =>
      readCatalogActivitiesPage(envelope([{ ...activityItem, type: "FESTIVAL" }]), "catalog"),
    ).toThrow(/type/);
    expect(() => readCatalogActivitiesPage(null, "catalog")).toThrow(/catalog/);
  });
});
