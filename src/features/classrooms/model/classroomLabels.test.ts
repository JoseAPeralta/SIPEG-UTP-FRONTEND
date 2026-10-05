// @vitest-environment node

import { describe, expect, it } from "vitest";

import { classroomTypeLabels, resolveAmenityLabel } from "./classroomLabels";

describe("classroomTypeLabels", () => {
  it("should label every classroom type in Spanish", () => {
    Object.entries(classroomTypeLabels).forEach(([code, label]) => {
      expect(label.trim()).not.toBe("");
      expect(label).not.toBe(code);
    });
  });
});

describe("resolveAmenityLabel", () => {
  it("should translate the amenity names the catalog already publishes", () => {
    expect(resolveAmenityLabel("projector")).toBe("Proyector");
    expect(resolveAmenityLabel("whiteboard")).toBe("Pizarra");
    expect(resolveAmenityLabel("smart-board")).toBe("Smart board");
    expect(resolveAmenityLabel("desks")).toBe("Escritorios");
    expect(resolveAmenityLabel("tables")).toBe("Mesas");
  });

  it("should show an unknown amenity as written because the contract has no catalog", () => {
    expect(resolveAmenityLabel("mesa-reglable")).toBe("mesa-reglable");
  });

  it("should not return the raw code for a known amenity", () => {
    for (const amenity of ["projector", "whiteboard", "smart-board", "desks", "tables"]) {
      expect(resolveAmenityLabel(amenity)).not.toBe(amenity);
    }
  });
});
