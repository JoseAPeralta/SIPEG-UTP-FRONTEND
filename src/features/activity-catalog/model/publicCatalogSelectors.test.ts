// @vitest-environment node

import { describe, expect, it } from "vitest";

import type { PublicActivity } from "@/types/domain";

import {
  buildPublicActivityRows,
  buildPublicProgramOptions,
  filterPublicActivityRows,
  paginatePublicActivityRows,
  publicActivityTypeOptions,
  summarizePublicCatalog,
  type PublicActivityRow,
  type PublicCatalogPeriod,
} from "./publicCatalogSelectors";

function createActivity(overrides: Partial<PublicActivity> & { id: string }): PublicActivity {
  return {
    bannerUrl: null,
    capacity: null,
    classroom: null,
    date: "2026-10-12",
    description: null,
    endTime: "12:00",
    name: `Actividad ${overrides.id}`,
    program: {
      id: "program-1",
      isDefault: true,
      label: null,
      name: "Programa de Eventos - Facultad de Ingenieria Civil",
    },
    speakers: [],
    startTime: "09:00",
    status: "SCHEDULED",
    type: "TALK",
    unit: { backendId: "fic", name: "Facultad de Ingenieria Civil", type: "FACULTY" },
    ...overrides,
  };
}

function createRows(activities: PublicActivity[]): PublicActivityRow[] {
  return buildPublicActivityRows({ activities });
}

const defaultFilters = {
  period: "all" as const,
  preferredUnit: null,
  programFilter: "all",
  searchTerm: "",
  sortDirection: "desc" as const,
  typeFilter: "all" as const,
  unitFilter: "all" as const,
  unitTypeFilter: "all" as const,
};

describe("buildPublicActivityRows", () => {
  it("should return no rows without a catalog", () => {
    expect(buildPublicActivityRows(null)).toEqual([]);
  });

  it("should resolve the unit code from the registry by name", () => {
    const rows = createRows([createActivity({ id: "a1" })]);

    expect(rows[0]?.unitCode).toBe("FIC");
    expect(rows[0]?.unitLabel).toBe("Facultad de Ingeniería Civil");
  });

  it("should keep the activity when the unit is unknown to the registry", () => {
    const rows = createRows([
      createActivity({
        id: "a1",
        unit: { backendId: "nueva", name: "Facultad Inventada", type: "FACULTY" },
      }),
    ]);

    expect(rows).toHaveLength(1);
    expect(rows[0]?.unitCode).toBeNull();
    expect(rows[0]?.unitLabel).toBe("Facultad Inventada");
  });

  it("should label a default program with the unit name", () => {
    const rows = createRows([createActivity({ id: "a1" })]);

    expect(rows[0]?.programBadgeLabel).toBe("Facultad de Ingeniería Civil");
  });

  it("should prefer a custom program label", () => {
    const rows = createRows([
      createActivity({
        id: "a1",
        program: { id: "p", isDefault: false, label: "CIT-2026", name: "Congreso" },
      }),
    ]);

    expect(rows[0]?.programBadgeLabel).toBe("CIT-2026");
  });
});

describe("filterPublicActivityRows", () => {
  const rows = createRows([
    createActivity({
      date: "2026-10-10",
      id: "a1",
      type: "TALK",
      unit: { backendId: "fic", name: "Facultad de Ingenieria Civil", type: "FACULTY" },
    }),
    createActivity({
      date: "2026-10-20",
      id: "a2",
      type: "WORKSHOP",
      unit: {
        backendId: "fisc",
        name: "Facultad de Ingenieria de Sistemas Computacionales",
        type: "FACULTY",
      },
    }),
    createActivity({
      classroom: { building: null, id: "c1", name: "Auditorio" },
      date: "2026-10-15",
      description: "Taller de drones",
      id: "a3",
      type: "WORKSHOP",
    }),
  ]);

  it("should order descending by default", () => {
    expect(filterPublicActivityRows(rows, defaultFilters).map((row) => row.activity.id)).toEqual([
      "a2",
      "a3",
      "a1",
    ]);
  });

  it("should order ascending on request", () => {
    expect(
      filterPublicActivityRows(rows, { ...defaultFilters, sortDirection: "asc" }).map(
        (row) => row.activity.id,
      ),
    ).toEqual(["a1", "a3", "a2"]);
  });

  it("should filter by unit code", () => {
    const filtered = filterPublicActivityRows(rows, { ...defaultFilters, unitFilter: "FISC" });

    expect(filtered.map((row) => row.activity.id)).toEqual(["a2"]);
  });

  it("should filter by activity type", () => {
    const filtered = filterPublicActivityRows(rows, { ...defaultFilters, typeFilter: "WORKSHOP" });

    expect(filtered.map((row) => row.activity.id)).toEqual(["a2", "a3"]);
  });

  it("should never match an activity whose unit is unknown to the registry", () => {
    const withUnknownUnit = createRows([
      createActivity({
        id: "a4",
        unit: { backendId: "nueva", name: "Facultad Inventada", type: "FACULTY" },
      }),
    ]);

    expect(
      filterPublicActivityRows(withUnknownUnit, { ...defaultFilters, unitFilter: "FIC" }),
    ).toEqual([]);
  });

  it("should search across name, description, classroom, program and speakers", () => {
    expect(
      filterPublicActivityRows(rows, { ...defaultFilters, searchTerm: "drones" }).map(
        (row) => row.activity.id,
      ),
    ).toEqual(["a3"]);
    expect(
      filterPublicActivityRows(rows, { ...defaultFilters, searchTerm: "auditorio" }).map(
        (row) => row.activity.id,
      ),
    ).toEqual(["a3"]);
    expect(
      filterPublicActivityRows(rows, { ...defaultFilters, searchTerm: "sistemas" }).map(
        (row) => row.activity.id,
      ),
    ).toEqual(["a2"]);
  });

  it("should classify every period by the effective status", () => {
    const periods = createRows([
      createActivity({ date: "2026-10-10", id: "scheduled", status: "SCHEDULED" }),
      createActivity({
        date: "2026-10-10",
        id: "ongoing",
        startTime: "10:00",
        status: "ONGOING",
      }),
      createActivity({ date: "2026-10-09", id: "completed", status: "COMPLETED" }),
    ]);
    const idsFor = (period: PublicCatalogPeriod) =>
      filterPublicActivityRows(periods, { ...defaultFilters, period, sortDirection: "asc" })
        .map((row) => row.activity.id)
        .sort();

    expect(idsFor("available")).toEqual(["ongoing", "scheduled"]);
    expect(idsFor("upcoming")).toEqual(["scheduled"]);
    expect(idsFor("past")).toEqual(["completed"]);
    expect(idsFor("all")).toEqual(["completed", "ongoing", "scheduled"]);
  });

  it("should filter by event program", () => {
    const withPrograms = createRows([
      createActivity({
        id: "a1",
        program: { id: "program-1", isDefault: false, label: "Uno", name: "Programa Uno" },
      }),
      createActivity({
        id: "a2",
        program: { id: "program-2", isDefault: false, label: "Dos", name: "Programa Dos" },
      }),
    ]);

    expect(
      filterPublicActivityRows(withPrograms, { ...defaultFilters, programFilter: "program-2" }).map(
        (row) => row.activity.id,
      ),
    ).toEqual(["a2"]);
  });

  it("should filter by organizational unit type", () => {
    const withTypes = createRows([
      createActivity({
        id: "faculty",
        unit: { backendId: "fic", name: "Facultad de Ingenieria Civil", type: "FACULTY" },
      }),
      createActivity({
        id: "subdirectorate",
        unit: { backendId: "sub-acad", name: "Subdirección Académica", type: "SUBDIRECTORATE" },
      }),
    ]);

    expect(
      filterPublicActivityRows(withTypes, {
        ...defaultFilters,
        unitTypeFilter: "SUBDIRECTORATE",
      }).map((row) => row.activity.id),
    ).toEqual(["subdirectorate"]);
  });

  it("should combine every filter with AND and keep a single match", () => {
    const combined = createRows([
      createActivity({
        classroom: { building: null, id: "c1", name: "Auditorio" },
        date: "2026-10-14",
        description: "Taller de drones para docentes",
        id: "match",
        program: { id: "p-target", isDefault: false, label: "Objetivo", name: "Programa Objetivo" },
        status: "SCHEDULED",
        type: "WORKSHOP",
        unit: {
          backendId: "fisc",
          name: "Facultad de Ingenieria de Sistemas Computacionales",
          type: "FACULTY",
        },
      }),
      createActivity({
        id: "other-program",
        program: { id: "p-other", isDefault: false, label: "Otro", name: "Programa Otro" },
        status: "SCHEDULED",
        type: "WORKSHOP",
        unit: {
          backendId: "fisc",
          name: "Facultad de Ingenieria de Sistemas Computacionales",
          type: "FACULTY",
        },
      }),
      createActivity({
        id: "other-status",
        program: { id: "p-target", isDefault: false, label: "Objetivo", name: "Programa Objetivo" },
        status: "COMPLETED",
        type: "WORKSHOP",
        unit: {
          backendId: "fisc",
          name: "Facultad de Ingenieria de Sistemas Computacionales",
          type: "FACULTY",
        },
      }),
    ]);

    const filtered = filterPublicActivityRows(combined, {
      period: "upcoming",
      preferredUnit: null,
      programFilter: "p-target",
      searchTerm: "drones",
      sortDirection: "asc",
      typeFilter: "WORKSHOP",
      unitFilter: "FISC",
      unitTypeFilter: "FACULTY",
    });

    expect(filtered.map((row) => row.activity.id)).toEqual(["match"]);
  });

  it("should prioritize the preferred unit without excluding other rows", () => {
    const rows = createRows([
      createActivity({
        date: "2026-10-12",
        id: "fic-late",
        unit: { backendId: "fic", name: "Facultad de Ingenieria Civil", type: "FACULTY" },
      }),
      createActivity({
        date: "2026-10-10",
        id: "fisc-first",
        unit: {
          backendId: "fisc",
          name: "Facultad de Ingenieria de Sistemas Computacionales",
          type: "FACULTY",
        },
      }),
      createActivity({
        date: "2026-10-14",
        id: "fisc-last",
        unit: {
          backendId: "fisc",
          name: "Facultad de Ingenieria de Sistemas Computacionales",
          type: "FACULTY",
        },
      }),
    ]);

    const ordered = filterPublicActivityRows(rows, {
      ...defaultFilters,
      preferredUnit: "FISC",
      sortDirection: "asc",
    });

    expect(ordered.map((row) => row.activity.id)).toEqual(["fisc-first", "fisc-last", "fic-late"]);
  });

  it("should prioritize a preferred unit by its backend id as well", () => {
    const rows = createRows([
      createActivity({
        date: "2026-10-10",
        id: "known",
        unit: { backendId: "fic", name: "Facultad de Ingenieria Civil", type: "FACULTY" },
      }),
      createActivity({
        date: "2026-10-11",
        id: "unknown",
        unit: { backendId: "nueva", name: "Facultad Inventada", type: "FACULTY" },
      }),
    ]);

    const ordered = filterPublicActivityRows(rows, {
      ...defaultFilters,
      preferredUnit: "nueva",
      sortDirection: "asc",
    });

    expect(ordered.map((row) => row.activity.id)).toEqual(["unknown", "known"]);
  });

  it("should ignore an all or empty preferred unit", () => {
    const rows = createRows([
      createActivity({ date: "2026-10-12", id: "a1" }),
      createActivity({ date: "2026-10-10", id: "a2" }),
    ]);

    expect(
      filterPublicActivityRows(rows, {
        ...defaultFilters,
        preferredUnit: "all",
        sortDirection: "asc",
      }).map((row) => row.activity.id),
    ).toEqual(["a2", "a1"]);
    expect(
      filterPublicActivityRows(rows, {
        ...defaultFilters,
        preferredUnit: "",
        sortDirection: "asc",
      }).map((row) => row.activity.id),
    ).toEqual(["a2", "a1"]);
  });

  it("should break equal timestamps by activity id", () => {
    const rows = createRows([
      createActivity({ date: "2026-10-10", id: "beta", startTime: "09:00" }),
      createActivity({ date: "2026-10-10", id: "alpha", startTime: "09:00" }),
    ]);

    expect(
      filterPublicActivityRows(rows, { ...defaultFilters, sortDirection: "asc" }).map(
        (row) => row.activity.id,
      ),
    ).toEqual(["alpha", "beta"]);
    expect(
      filterPublicActivityRows(rows, { ...defaultFilters, sortDirection: "desc" }).map(
        (row) => row.activity.id,
      ),
    ).toEqual(["beta", "alpha"]);
  });

  it("should keep an unknown unit filterable by unit type, program and activity type", () => {
    const unknown = createRows([
      createActivity({
        id: "unknown",
        program: {
          id: "p-unknown",
          isDefault: false,
          label: "Especial",
          name: "Programa Especial",
        },
        type: "CONFERENCE",
        unit: { backendId: "nueva", name: "Facultad Inventada", type: "SUBDIRECTORATE" },
      }),
    ]);

    expect(
      filterPublicActivityRows(unknown, {
        ...defaultFilters,
        unitTypeFilter: "SUBDIRECTORATE",
      }).map((row) => row.activity.id),
    ).toEqual(["unknown"]);
    expect(
      filterPublicActivityRows(unknown, { ...defaultFilters, programFilter: "p-unknown" }).map(
        (row) => row.activity.id,
      ),
    ).toEqual(["unknown"]);
    expect(
      filterPublicActivityRows(unknown, { ...defaultFilters, typeFilter: "CONFERENCE" }).map(
        (row) => row.activity.id,
      ),
    ).toEqual(["unknown"]);
  });
});

describe("buildPublicProgramOptions", () => {
  it("should group every program once and sort it by its Spanish label", () => {
    const rows = createRows([
      createActivity({
        id: "a1",
        program: { id: "p-b", isDefault: false, label: "Zeta", name: "Programa Zeta" },
      }),
      createActivity({
        id: "a2",
        program: { id: "p-a", isDefault: false, label: "Alfa", name: "Programa Alfa" },
      }),
      createActivity({
        id: "a3",
        program: { id: "p-b", isDefault: false, label: "Zeta", name: "Programa Zeta" },
      }),
    ]);

    expect(buildPublicProgramOptions(rows)).toEqual([
      { id: "p-a", label: "Alfa" },
      { id: "p-b", label: "Zeta" },
    ]);
  });

  it("should fall back to the program name when there is no label", () => {
    const rows = createRows([
      createActivity({
        id: "a1",
        program: {
          id: "p-default",
          isDefault: true,
          label: null,
          name: "Programa de Eventos - Unidad",
        },
      }),
    ]);

    expect(buildPublicProgramOptions(rows)).toEqual([
      { id: "p-default", label: "Programa de Eventos - Unidad" },
    ]);
  });

  it("should return no options without rows", () => {
    expect(buildPublicProgramOptions([])).toEqual([]);
  });
});

describe("paginatePublicActivityRows", () => {
  it("should return one empty page for an empty agenda", () => {
    expect(paginatePublicActivityRows([], 1, 10)).toEqual({
      currentPage: 1,
      pageCount: 1,
      rows: [],
    });
  });

  it("should clamp a page beyond the last one", () => {
    const rows = createRows([createActivity({ id: "a1" })]);

    expect(paginatePublicActivityRows(rows, 9, 10).currentPage).toBe(1);
  });

  it("should clamp a page below the first one", () => {
    const rows = createRows([createActivity({ id: "a1" })]);

    expect(paginatePublicActivityRows(rows, 0, 10).currentPage).toBe(1);
    expect(paginatePublicActivityRows(rows, -3, 10).currentPage).toBe(1);
  });

  it("should slice the requested page", () => {
    const rows = createRows([
      createActivity({ date: "2026-10-01", id: "a1" }),
      createActivity({ date: "2026-10-02", id: "a2" }),
      createActivity({ date: "2026-10-03", id: "a3" }),
    ]);
    const sorted = filterPublicActivityRows(rows, { ...defaultFilters, sortDirection: "asc" });

    expect(paginatePublicActivityRows(sorted, 2, 2).rows.map((row) => row.activity.id)).toEqual([
      "a3",
    ]);
  });
});

describe("summarizePublicCatalog", () => {
  it("should return no summary without a catalog", () => {
    expect(summarizePublicCatalog(null)).toBeNull();
  });

  it("should count the published activities", () => {
    expect(
      summarizePublicCatalog({
        activities: [createActivity({ id: "a1" }), createActivity({ id: "a2" })],
      }),
    ).toEqual({ activityCount: 2 });
  });
});

describe("publicActivityTypeOptions", () => {
  it("should offer every activity type once, sorted by its Spanish label", () => {
    const labels = publicActivityTypeOptions.map((option) => option.label);

    expect(publicActivityTypeOptions).toHaveLength(8);
    expect(new Set(labels).size).toBe(8);
    expect([...labels].sort((first, second) => first.localeCompare(second, "es"))).toEqual(labels);
  });

  it("should not expose raw API codes as visible text", () => {
    expect(publicActivityTypeOptions.every((option) => !/^[A-Z_]+$/.test(option.label))).toBe(true);
  });
});
