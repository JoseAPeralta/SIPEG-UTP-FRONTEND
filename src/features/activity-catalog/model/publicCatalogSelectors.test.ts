// @vitest-environment node

import { describe, expect, it } from "vitest";

import type { PublicActivity } from "@/types/domain";

import {
  buildPublicActivityRows,
  filterPublicActivityRows,
  paginatePublicActivityRows,
  publicActivityTypeOptions,
  summarizePublicCatalog,
  type PublicActivityRow,
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
    type: "TALK",
    unit: { backendId: "fic", name: "Facultad de Ingenieria Civil", type: "FACULTY" },
    ...overrides,
  };
}

function createRows(activities: PublicActivity[]): PublicActivityRow[] {
  return buildPublicActivityRows({ activities });
}

const defaultFilters = {
  searchTerm: "",
  sortDirection: "desc" as const,
  typeFilter: "all" as const,
  unitFilter: "all" as const,
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
