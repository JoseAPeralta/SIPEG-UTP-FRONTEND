// @vitest-environment node

import { describe, expect, it } from "vitest";

import { eventProgramLifecycleActions } from "./eventProgramLifecycle";

describe("eventProgramLifecycleActions", () => {
  it.each([
    { status: "DRAFT" as const, expected: ["edit", "publish", "archive"] },
    { status: "ACTIVE" as const, expected: ["edit", "archive"] },
    { status: "COMPLETED" as const, expected: ["edit", "archive"] },
    { status: "CANCELLED" as const, expected: ["edit", "archive"] },
    { status: "ARCHIVED" as const, expected: ["reactivate"] },
  ])("should offer $expected for an additional $status program", ({ status, expected }) => {
    expect(eventProgramLifecycleActions({ isDefault: false, status })).toEqual(expected);
  });

  it("should only allow editing the permanent agenda while it is not archived", () => {
    expect(eventProgramLifecycleActions({ isDefault: true, status: "ACTIVE" })).toEqual(["edit"]);
    expect(eventProgramLifecycleActions({ isDefault: true, status: "ARCHIVED" })).toEqual([]);
  });
});
