import { describe, expect, it } from "vitest";

import { mockActivityCatalog } from "@/data/mock";

import { createMockActivityCatalogAdapter } from "./mockActivityCatalogAdapter";

describe("createMockActivityCatalogAdapter", () => {
  it("should resolve the mock catalog with programs, units and activities", async () => {
    const catalog = await createMockActivityCatalogAdapter().loadCatalog();

    expect(catalog.organizationalUnits.length).toBeGreaterThan(0);
    expect(catalog.eventPrograms.length).toBeGreaterThan(0);
    expect(catalog.activities.length).toBeGreaterThan(0);
    expect(catalog.activities).toHaveLength(mockActivityCatalog.activities.length);
  });

  it("should keep every activity attached to a program", async () => {
    const catalog = await createMockActivityCatalogAdapter().loadCatalog();
    const programIds = new Set(catalog.eventPrograms.map((program) => program.id));

    expect(catalog.activities.every((activity) => programIds.has(activity.eventProgramId))).toBe(
      true,
    );
  });
});
