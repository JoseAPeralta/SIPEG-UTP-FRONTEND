import { describe, expect, it } from "vitest";

import { queryKeys } from "./queryKeys";

function isPrefix(prefix: readonly unknown[], key: readonly unknown[]): boolean {
  return prefix.every((part, index) => key[index] === part);
}

describe("queryKeys prefixes", () => {
  it("should match every availability criteria from one root", () => {
    const key = queryKeys.availableClassrooms({
      date: "2026-08-24",
      endTime: "11:00",
      startTime: "09:00",
    });

    expect(isPrefix(queryKeys.availableClassroomsRoot, key)).toBe(true);
  });

  it("should match every public unit detail from one root", () => {
    expect(
      isPrefix(
        queryKeys.publicOrganizationalUnitDetails,
        queryKeys.publicOrganizationalUnitDetail("fisc"),
      ),
    ).toBe(true);
  });

  it("should scope administrative unit details to one identity", () => {
    const scoped = queryKeys.administrativeOrganizationalUnitDetails("user-1");

    expect(
      isPrefix(scoped, queryKeys.administrativeOrganizationalUnitDetail("user-1", "fisc")),
    ).toBe(true);
    expect(
      isPrefix(scoped, queryKeys.administrativeOrganizationalUnitDetail("user-2", "fisc")),
    ).toBe(false);
  });

  it("should scope administrative classroom lists by identity across filters", () => {
    const scoped = queryKeys.administrativeClassroomsScope("user-1");

    expect(
      isPrefix(scoped, queryKeys.administrativeClassrooms("user-1", { type: "CLASSROOM" })),
    ).toBe(true);
    expect(
      isPrefix(scoped, queryKeys.administrativeClassrooms("user-2", { type: "CLASSROOM" })),
    ).toBe(false);
  });

  it("should keep the public detail root out of the administrative boundary", () => {
    expect(
      isPrefix(
        queryKeys.publicOrganizationalUnitDetails,
        queryKeys.administrativeOrganizationalUnitDetail("user-1", "fisc"),
      ),
    ).toBe(false);
  });

  it("should scope administrative user pages by identity across filters", () => {
    const scoped = queryKeys.administrativeUsersScope("user-1");

    expect(
      isPrefix(scoped, queryKeys.administrativeUsersPage("user-1", { globalRole: "ADMIN" }, 2)),
    ).toBe(true);
    expect(isPrefix(scoped, queryKeys.administrativeUsers("user-1"))).toBe(true);
    expect(isPrefix(scoped, queryKeys.administrativeUsersPage("user-2", {}, 1))).toBe(false);
  });

  it("should scope administrative user details to one identity", () => {
    expect(
      isPrefix(
        queryKeys.administrativeUsersScope("user-1"),
        queryKeys.administrativeUserDetail("user-1", "user-2"),
      ),
    ).toBe(false);
    expect(
      isPrefix(
        ["administrative-user-detail", "user-1"],
        queryKeys.administrativeUserDetail("user-1", "user-2"),
      ),
    ).toBe(true);
  });
});
