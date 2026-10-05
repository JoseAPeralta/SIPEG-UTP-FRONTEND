// @vitest-environment node

import { describe, expect, it } from "vitest";

import {
  PERMISSION_ORIGINS,
  USER_SCOPE_STATUSES,
  USER_SCOPE_TYPES,
  isPermissionOrigin,
  isUserScopeStatus,
  isUserScopeType,
} from "./userScopes";

const EXPECTED_TYPES = ["program", "activity"];

const EXPECTED_STATUSES = [
  "DRAFT",
  "ACTIVE",
  "COMPLETED",
  "CANCELLED",
  "ARCHIVED",
  "SCHEDULED",
  "ONGOING",
];

const EXPECTED_ORIGINS = ["LOCAL", "INHERITED", "BOTH"];

describe("collaboration user scopes model", () => {
  it("should expose exactly the contractual scope types", () => {
    expect([...USER_SCOPE_TYPES]).toEqual(EXPECTED_TYPES);
  });

  it("should expose the merged status enum, including non-public states", () => {
    expect([...USER_SCOPE_STATUSES]).toEqual(EXPECTED_STATUSES);
    expect(USER_SCOPE_STATUSES).toContain("DRAFT");
    expect(USER_SCOPE_STATUSES).toContain("ARCHIVED");
    expect(USER_SCOPE_STATUSES).toContain("CANCELLED");
  });

  it("should expose exactly the contractual permission origins", () => {
    expect([...PERMISSION_ORIGINS]).toEqual(EXPECTED_ORIGINS);
  });

  it("should identify valid scope types and statuses", () => {
    expect(isUserScopeType("program")).toBe(true);
    expect(isUserScopeType("activity")).toBe(true);
    expect(isUserScopeType("event")).toBe(false);
    expect(isUserScopeType(null)).toBe(false);
    expect(isUserScopeType(42)).toBe(false);

    expect(isUserScopeStatus("DRAFT")).toBe(true);
    expect(isUserScopeStatus("ONGOING")).toBe(true);
    expect(isUserScopeStatus("RESCHEDULED")).toBe(false);
    expect(isUserScopeStatus(undefined)).toBe(false);
  });

  it("should identify valid permission origins", () => {
    expect(isPermissionOrigin("LOCAL")).toBe(true);
    expect(isPermissionOrigin("BOTH")).toBe(true);
    expect(isPermissionOrigin("GRANTED")).toBe(false);
    expect(isPermissionOrigin({})).toBe(false);
  });
});
