// @vitest-environment node

import { describe, expect, it } from "vitest";

import { ALERT_TARGET_KINDS, ALERT_TYPES, isAlertTargetKind, isAlertType } from "./alert";

describe("alert guards", () => {
  it("should accept only contractual alert types", () => {
    ALERT_TYPES.forEach((type) => expect(isAlertType(type)).toBe(true));
    expect(isAlertType("PROPOSAL_ARCHIVED")).toBe(false);
    expect(isAlertType(undefined)).toBe(false);
  });

  it("should accept only contractual target kinds", () => {
    ALERT_TARGET_KINDS.forEach((kind) => expect(isAlertTargetKind(kind)).toBe(true));
    expect(isAlertTargetKind("USER")).toBe(false);
    expect(isAlertTargetKind(7)).toBe(false);
  });
});
