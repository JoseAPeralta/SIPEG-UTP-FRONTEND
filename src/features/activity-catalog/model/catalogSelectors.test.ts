// @vitest-environment node

import { describe, expect, it } from "vitest";

import {
  buildActivityRows,
  buildProgramSummaries,
  buildUnitOptions,
  filterActivityRows,
  getProgramBadgeLabel,
  paginateActivityRows,
  summarizeCatalog,
} from "./catalogSelectors";
import {
  createActivity,
  createCatalog,
  createClassroom,
  createEventProgram,
  createOrganizationalUnit,
} from "@/test/factories";

const catalog = createCatalog({
  activities: [
    createActivity({
      date: "2026-06-16",
      enrolledCount: 30,
      id: "activity-late",
      name: "Ciberseguridad en servicios estudiantiles",
      startTime: "14:00",
      type: "TALK",
    }),
    createActivity({
      date: "2026-06-15",
      enrolledCount: 20,
      id: "activity-early",
      name: "Campus inteligente y datos abiertos",
      startTime: "09:00",
      type: "SEMINAR",
    }),
  ],
  classrooms: [createClassroom({ id: "classroom-1", name: "Auditorio Roberto Barraza" })],
  eventPrograms: [createEventProgram({ id: "program-1" })],
  organizationalUnits: [createOrganizationalUnit({ id: "fic" })],
});

describe("buildActivityRows", () => {
  it("should resolve program, unit and classroom for every activity", () => {
    const rows = buildActivityRows(catalog);

    expect(rows).toHaveLength(2);
    expect(rows[0]?.program.id).toBe("program-1");
    expect(rows[0]?.unit.id).toBe("fic");
    expect(rows[0]?.classroom?.name).toBe("Auditorio Roberto Barraza");
  });

  it("should skip activities with dangling program references", () => {
    const dangling = createCatalog({
      activities: [createActivity({ eventProgramId: "program-missing" })],
    });

    expect(buildActivityRows(dangling)).toHaveLength(0);
  });

  it("should keep a null classroom when the activity has none", () => {
    const withoutClassroom = createCatalog({
      activities: [createActivity({ classroomId: null })],
    });

    expect(buildActivityRows(withoutClassroom)[0]?.classroom).toBeNull();
  });
});

describe("filterActivityRows", () => {
  const rows = buildActivityRows(catalog);
  const baseFilters = {
    programFilter: "all",
    searchTerm: "",
    sortDirection: "asc",
    typeFilter: "all",
    unitFilter: "all",
  } as const;

  it("should order activities by date and start time ascending", () => {
    const filtered = filterActivityRows(rows, { ...baseFilters });

    expect(filtered.map((row) => row.activity.id)).toEqual(["activity-early", "activity-late"]);
  });

  it("should reverse the order when sorting descending", () => {
    const filtered = filterActivityRows(rows, { ...baseFilters, sortDirection: "desc" });

    expect(filtered.map((row) => row.activity.id)).toEqual(["activity-late", "activity-early"]);
  });

  it("should search ignoring case and surrounding whitespace", () => {
    const filtered = filterActivityRows(rows, { ...baseFilters, searchTerm: "  CIBERSEGURIDAD " });

    expect(filtered.map((row) => row.activity.id)).toEqual(["activity-late"]);
  });

  it("should search by classroom, unit, program and speaker names", () => {
    const byClassroom = filterActivityRows(rows, { ...baseFilters, searchTerm: "auditorio" });
    const byUnit = filterActivityRows(rows, { ...baseFilters, searchTerm: "FIC" });
    const byProgram = filterActivityRows(rows, { ...baseFilters, searchTerm: "innovacion" });

    expect(byClassroom).toHaveLength(2);
    expect(byUnit).toHaveLength(2);
    expect(byProgram).toHaveLength(2);
  });

  it("should combine unit, type and program filters with AND logic", () => {
    const filtered = filterActivityRows(rows, {
      ...baseFilters,
      programFilter: "program-1",
      typeFilter: "TALK",
      unitFilter: "fic",
    });

    expect(filtered.map((row) => row.activity.id)).toEqual(["activity-late"]);
  });

  it("should return an empty list when a filter excludes every activity", () => {
    const filtered = filterActivityRows(rows, { ...baseFilters, unitFilter: "fie" });

    expect(filtered).toEqual([]);
  });

  it("should not mutate the source rows", () => {
    const source = buildActivityRows(catalog);
    const before = source.map((row) => row.activity.id);

    filterActivityRows(source, { ...baseFilters, sortDirection: "desc" });

    expect(source.map((row) => row.activity.id)).toEqual(before);
  });
});

describe("paginateActivityRows", () => {
  const rows = buildActivityRows(catalog);

  it("should clamp the requested page into the available range", () => {
    expect(paginateActivityRows(rows, 9, 1).currentPage).toBe(2);
    expect(paginateActivityRows(rows, 0, 1).currentPage).toBe(1);
  });

  it("should slice the requested page", () => {
    const page = paginateActivityRows(rows, 2, 1);

    expect(page.pageCount).toBe(2);
    expect(page.rows.map((row) => row.activity.id)).toEqual(["activity-early"]);
  });

  it("should report one empty page when there are no activities", () => {
    const page = paginateActivityRows([], 1, 9);

    expect(page.pageCount).toBe(1);
    expect(page.rows).toEqual([]);
  });
});

describe("summarizeCatalog", () => {
  it("should total programs, units, activities and enrolled attendees", () => {
    expect(summarizeCatalog(catalog)).toEqual({
      activityCount: 2,
      enrolledCount: 50,
      programCount: 1,
      unitCount: 1,
    });
  });
});

describe("buildProgramSummaries", () => {
  it("should aggregate activity and attendee totals per program", () => {
    const summaries = buildProgramSummaries(catalog);

    expect(summaries).toHaveLength(1);
    expect(summaries[0]?.activityCount).toBe(2);
    expect(summaries[0]?.enrolledCount).toBe(50);
    expect(summaries[0]?.unit.id).toBe("fic");
  });

  it("should keep programs without activities", () => {
    const withEmptyProgram = createCatalog({
      eventPrograms: [
        createEventProgram({
          id: "program-empty",
          isDefault: true,
          startDate: null,
          endDate: null,
        }),
      ],
    });

    expect(buildProgramSummaries(withEmptyProgram)).toHaveLength(1);
    expect(buildProgramSummaries(withEmptyProgram)[0]?.activityCount).toBe(0);
  });
});

describe("buildUnitOptions", () => {
  it("should label units with their code and name", () => {
    expect(buildUnitOptions(catalog)).toEqual([
      { id: "fic", label: "FIC - Facultad de Ingenieria Civil" },
    ]);
  });
});

describe("getProgramBadgeLabel", () => {
  const unit = createOrganizationalUnit({ code: "FIC", name: "Facultad de Ingenieria Civil" });

  it("should prefer the custom program label", () => {
    const program = createEventProgram({ label: "Semana de innovacion" });

    expect(getProgramBadgeLabel(program, unit)).toBe("Semana de innovacion");
  });

  it("should use the unit name for default programs without a label", () => {
    const program = createEventProgram({
      isDefault: true,
      label: null,
      name: "Programa de Eventos - Facultad de Ingenieria Civil",
    });

    expect(getProgramBadgeLabel(program, unit)).toBe("Facultad de Ingenieria Civil");
  });

  it("should use the program name for additional programs without a label", () => {
    const program = createEventProgram({
      isDefault: false,
      label: null,
      name: "Foro de Infraestructura Resiliente",
    });

    expect(getProgramBadgeLabel(program, unit)).toBe("Foro de Infraestructura Resiliente");
  });
});
