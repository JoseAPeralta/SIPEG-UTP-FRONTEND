// @vitest-environment node

import { describe, expect, it } from "vitest";

import { isPersistedQueryKey, queryKeys } from "./queryKeys";

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

  it("should scope discovered user scopes by identity across filters", () => {
    const scoped = queryKeys.userScopesScope("user-1");

    expect(isPrefix(scoped, queryKeys.userScopes("user-1", { type: "program" }))).toBe(true);
    expect(isPrefix(scoped, queryKeys.userScopes("user-1"))).toBe(true);
    expect(isPrefix(scoped, queryKeys.userScopes("user-2", { type: "activity" }))).toBe(false);
  });

  it("should scope private alerts by identity across filters and pages", () => {
    const scoped = queryKeys.alertsScope("user-1");

    expect(isPrefix(scoped, queryKeys.alertsPage("user-1", { isRead: false }, 2))).toBe(true);
    expect(isPrefix(scoped, queryKeys.alertsPage("user-1", {}, 1))).toBe(true);
    expect(isPrefix(scoped, queryKeys.alertsPage("user-2", {}, 1))).toBe(false);
  });

  it("should never persist private alerts", () => {
    expect(isPersistedQueryKey(queryKeys.alertsPage("user-1", {}, 1))).toBe(false);
    expect(isPersistedQueryKey(queryKeys.alertsScope("user-1"))).toBe(false);
  });

  it("should never persist discovered user scopes", () => {
    expect(isPersistedQueryKey(queryKeys.userScopes("user-1"))).toBe(false);
    expect(isPersistedQueryKey(queryKeys.userScopes("user-1", { type: "activity" }))).toBe(false);
  });

  it("should scope activity administration pages by identity across programs, filters and pages", () => {
    const scoped = queryKeys.activityAdministrationScope("user-1");

    expect(
      isPrefix(
        scoped,
        queryKeys.activityAdministrationPage("user-1", "program-1", { status: "ALL" }, 2),
      ),
    ).toBe(true);
    expect(
      isPrefix(scoped, queryKeys.activityAdministrationPage("user-2", "program-1", {}, 1)),
    ).toBe(false);
    expect(
      isPrefix(
        queryKeys.activityAdministrationDetailScope("user-1"),
        queryKeys.activityAdministrationDetail("user-1", "activity-1"),
      ),
    ).toBe(true);
    expect(
      isPrefix(
        queryKeys.activityAdministrationDetailScope("user-1"),
        queryKeys.activityAdministrationDetail("user-2", "activity-1"),
      ),
    ).toBe(false);
    expect(
      isPrefix(
        queryKeys.administrativeEventPrograms("user-1"),
        queryKeys.administrativeEventProgramsAll("user-1"),
      ),
    ).toBe(true);
  });

  it("should scope activity administration pages to the owning program only", () => {
    const scoped = queryKeys.activityAdministrationProgramScope("user-1", "program-1");

    expect(
      isPrefix(
        scoped,
        queryKeys.activityAdministrationPage("user-1", "program-1", { status: "ALL" }, 2),
      ),
    ).toBe(true);
    expect(
      isPrefix(
        scoped,
        queryKeys.activityAdministrationPage("user-1", "program-2", { status: "ALL" }, 2),
      ),
    ).toBe(false);
    expect(
      isPrefix(scoped, queryKeys.activityAdministrationPage("user-2", "program-1", {}, 1)),
    ).toBe(false);
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
