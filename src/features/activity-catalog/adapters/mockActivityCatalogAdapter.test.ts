// @vitest-environment node

import { describe, expect, it, vi } from "vitest";

import { mockActivityCatalog } from "@/data/mock";

import { createMockActivityCatalogAdapter as createCatalogAdapter } from "./mockActivityCatalogAdapter";
import { createMockEventProgramsAdapter } from "@/features/event-programs";

const createMockActivityCatalogAdapter = () =>
  createCatalogAdapter(createMockEventProgramsAdapter());

describe("createMockActivityCatalogAdapter", () => {
  it("should delegate the program listing to the administrative read", async () => {
    const programs = createMockEventProgramsAdapter();
    const loadEventPrograms = vi.spyOn(programs, "loadEventPrograms");
    const catalog = await createCatalogAdapter(programs).loadCatalog();

    expect(loadEventPrograms).toHaveBeenCalledWith("administrative");
    expect(Object.keys(catalog).sort()).toEqual(["activities", "eventPrograms"]);
  });

  it("should resolve only programs and activities", async () => {
    const catalog = await createMockActivityCatalogAdapter().loadCatalog();

    expect(catalog.eventPrograms.length).toBeGreaterThan(0);
    expect(catalog.activities).toHaveLength(mockActivityCatalog.activities.length);
  });

  it("should expose listing summaries without detail fields", async () => {
    const catalog = await createMockActivityCatalogAdapter().loadCatalog();

    expect(catalog.activities.length).toBeGreaterThan(0);

    for (const activity of catalog.activities) {
      for (const field of ["cancelReason", "checkedInCount", "enrolledCount", "equipment"]) {
        expect(activity).not.toHaveProperty(field);
      }
    }
  });

  it("should load every program status in the all-programs mode", async () => {
    const programs = createMockEventProgramsAdapter({ readGlobalRole: () => "ADMIN" });
    const loadEventPrograms = vi.spyOn(programs, "loadEventPrograms");

    const catalog = await createCatalogAdapter(programs).loadCatalog("all-programs");

    expect(loadEventPrograms).toHaveBeenCalledWith("administrative", "ALL");
    expect(catalog.eventPrograms.some((program) => program.status === "DRAFT")).toBe(true);
    expect(catalog.eventPrograms.some((program) => program.status === "ARCHIVED")).toBe(true);
  });

  it("should keep every activity attached to a program", async () => {
    const catalog = await createMockActivityCatalogAdapter().loadCatalog();
    const programIds = new Set(catalog.eventPrograms.map((program) => program.id));

    expect(catalog.activities.every((activity) => programIds.has(activity.eventProgramId))).toBe(
      true,
    );
  });

  it("should return deeply independent copies on every load", async () => {
    const adapter = createMockActivityCatalogAdapter();
    const first = await adapter.loadCatalog();
    const second = await adapter.loadCatalog();
    const originalSpeakerName = second.activities[0]?.speakers[0]?.firstName;

    if (first.activities[0]?.speakers[0]) {
      first.activities[0].speakers[0].firstName = "Mutado";
    }

    expect(second).not.toBe(first);
    expect(second.activities[0]?.speakers[0]?.firstName).toBe(originalSpeakerName);
    expect(mockActivityCatalog.activities[0]?.speakers[0]?.firstName).toBe(originalSpeakerName);
  });
});
