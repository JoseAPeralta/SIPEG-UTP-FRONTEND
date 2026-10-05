// @vitest-environment node

import { describe, expect, it } from "vitest";

import { mockActivityCatalog } from "@/data/mock";

import { createMockActivityCatalogAdapter } from "./mockActivityCatalogAdapter";

describe("createMockActivityCatalogAdapter", () => {
  it("should resolve only programs and activities", async () => {
    const catalog = await createMockActivityCatalogAdapter().loadCatalog("public");

    expect(Object.keys(catalog).sort()).toEqual(["activities", "eventPrograms"]);
    expect(catalog.eventPrograms.length).toBeGreaterThan(0);
    expect(catalog.activities).toHaveLength(mockActivityCatalog.activities.length);
  });

  it("should keep every activity attached to a program", async () => {
    const catalog = await createMockActivityCatalogAdapter().loadCatalog("administrative");
    const programIds = new Set(catalog.eventPrograms.map((program) => program.id));

    expect(catalog.activities.every((activity) => programIds.has(activity.eventProgramId))).toBe(
      true,
    );
  });

  it("should return deeply independent copies on every load", async () => {
    const adapter = createMockActivityCatalogAdapter();
    const first = await adapter.loadCatalog("public");
    const second = await adapter.loadCatalog("public");
    const originalSpeakerName = second.activities[0]?.speakers[0]?.firstName;

    if (first.activities[0]?.speakers[0]) {
      first.activities[0].speakers[0].firstName = "Mutado";
    }

    expect(second).not.toBe(first);
    expect(second.activities[0]?.speakers[0]?.firstName).toBe(originalSpeakerName);
    expect(mockActivityCatalog.activities[0]?.speakers[0]?.firstName).toBe(originalSpeakerName);
  });
});
