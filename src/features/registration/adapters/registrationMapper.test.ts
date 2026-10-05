// @vitest-environment node

import { describe, expect, it } from "vitest";

import { mapRegistrationResult } from "./registrationMapper";

describe("registrationMapper", () => {
  it("should validate the registration result", () => {
    expect(mapRegistrationResult({ userId: "user-1" })).toEqual({ userId: "user-1" });
    expect(() => mapRegistrationResult({})).toThrow(/userId/);
  });
});
