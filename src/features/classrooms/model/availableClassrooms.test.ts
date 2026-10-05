// @vitest-environment node

import { describe, expect, it } from "vitest";

import {
  isAvailableClassroomsCriteriaValid,
  normalizeAvailableClassroomsCriteria,
} from "./availableClassrooms";

describe("availableClassrooms", () => {
  it("should normalize the optional amenity without adding empty filters", () => {
    expect(
      normalizeAvailableClassroomsCriteria({
        amenity: "  projector  ",
        date: "2026-08-24",
        endTime: "11:00",
        minCapacity: 40,
        startTime: "09:00",
        type: "LABORATORY",
      }),
    ).toEqual({
      amenity: "projector",
      date: "2026-08-24",
      endTime: "11:00",
      minCapacity: 40,
      startTime: "09:00",
      type: "LABORATORY",
    });

    expect(
      normalizeAvailableClassroomsCriteria({
        amenity: "   ",
        date: "2026-08-24",
        endTime: "11:00",
        startTime: "09:00",
      }),
    ).toEqual({ date: "2026-08-24", endTime: "11:00", startTime: "09:00" });
  });

  it("should accept only a complete chronological classroom need", () => {
    expect(
      isAvailableClassroomsCriteriaValid({
        date: "2026-08-24",
        endTime: "11:00",
        minCapacity: 40,
        startTime: "09:00",
      }),
    ).toBe(true);
    expect(
      isAvailableClassroomsCriteriaValid({
        date: "2026-8-24",
        endTime: "11:00",
        startTime: "09:00",
      }),
    ).toBe(false);
    expect(
      isAvailableClassroomsCriteriaValid({
        date: "2026-08-24",
        endTime: "09:00",
        startTime: "09:00",
      }),
    ).toBe(false);
    expect(
      isAvailableClassroomsCriteriaValid({
        date: "2026-08-24",
        endTime: "11:00",
        minCapacity: 0,
        startTime: "09:00",
      }),
    ).toBe(false);
  });
});
