import { describe, expect, it } from "vitest";

import {
  mapRegistrationCareer,
  mapRegistrationResult,
  mapRegistrationUnit,
} from "./registrationMapper";

describe("registrationMapper", () => {
  it("should map registration catalog entries", () => {
    expect(
      mapRegistrationUnit({
        code: "FISC",
        description: null,
        head: null,
        id: "unit-1",
        isActive: true,
        name: "Facultad de Sistemas",
        type: "FACULTY",
      }),
    ).toMatchObject({ id: "unit-1", type: "FACULTY" });

    expect(
      mapRegistrationCareer({
        code: "SOF",
        description: null,
        id: "career-1",
        name: "Ingenieria de Software",
        unit: { code: "FISC", id: "unit-1", name: "Facultad de Sistemas" },
      }),
    ).toEqual({
      code: "SOF",
      id: "career-1",
      name: "Ingenieria de Software",
      unitId: "unit-1",
    });
  });

  it("should preserve a global career without a unit", () => {
    expect(
      mapRegistrationCareer({
        code: "OTROS",
        description: null,
        id: "career-other",
        name: "Otros",
        unit: null,
      }),
    ).toMatchObject({ unitId: null });
  });

  it("should validate the registration result", () => {
    expect(mapRegistrationResult({ userId: "user-1" })).toEqual({ userId: "user-1" });
    expect(() => mapRegistrationResult({})).toThrow(/userId/);
  });
});
