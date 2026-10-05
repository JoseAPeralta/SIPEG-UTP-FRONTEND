// @vitest-environment node

import { describe, expect, it } from "vitest";

import { createActivity, createCatalog, createEventProgram } from "@/test/factories";

import { assertCatalogIntegrity } from "./catalogIntegrity";

describe("assertCatalogIntegrity", () => {
  it("should accept a consistent catalog", () => {
    const catalog = createCatalog();

    expect(() => assertCatalogIntegrity(catalog)).not.toThrow();
  });

  it("should reject activities with a dangling program", () => {
    const catalog = createCatalog({
      activities: [createActivity({ eventProgramId: "program-missing" })],
    });

    expect(() => assertCatalogIntegrity(catalog)).toThrow(/program-missing/);
  });

  it("should reject programs with a dangling unit", () => {
    const catalog = createCatalog({
      eventPrograms: [createEventProgram({ organizationalUnitId: "unit-missing" })],
    });

    expect(() => assertCatalogIntegrity(catalog)).toThrow(/unit-missing/);
  });

  it("should reject duplicate identifiers", () => {
    const catalog = createCatalog({
      activities: [createActivity({ id: "activity-1" }), createActivity({ id: "activity-1" })],
    });

    expect(() => assertCatalogIntegrity(catalog)).toThrow(/activity-1/);
  });
});
