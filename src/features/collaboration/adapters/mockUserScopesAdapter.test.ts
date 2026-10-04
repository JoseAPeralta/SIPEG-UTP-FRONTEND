import { describe, expect, it } from "vitest";

import { mockActivityCatalog } from "@/data/mock/catalog";

import { PERMISSION_NAMES } from "../model/permissions";
import { createMockUserScopesAdapter } from "./mockUserScopesAdapter";

const { activities, eventPrograms } = mockActivityCatalog;

function adapter() {
  return createMockUserScopesAdapter();
}

describe("createMockUserScopesAdapter", () => {
  it("should derive every program and activity from the mock catalog", async () => {
    const scopes = await adapter().loadUserScopes();

    expect(scopes).toHaveLength(eventPrograms.length + activities.length);

    const programs = scopes.filter((scope) => scope.type === "program");
    const derivedActivities = scopes.filter((scope) => scope.type === "activity");

    expect(programs.map((scope) => scope.id).sort()).toEqual(
      eventPrograms.map((program) => program.id).sort(),
    );
    expect(programs.every((scope) => scope.eventProgram === null)).toBe(true);

    expect(derivedActivities.map((scope) => scope.id).sort()).toEqual(
      activities.map((activity) => activity.id).sort(),
    );

    derivedActivities.forEach((scope) => {
      const activity = activities.find((candidate) => candidate.id === scope.id);
      expect(scope.eventProgram?.id).toBe(activity?.eventProgramId);
      expect(scope.organizationalUnit.id).toBe(
        eventPrograms.find((program) => program.id === activity?.eventProgramId)
          ?.organizationalUnitId,
      );
    });
  });

  it("should order scopes by name and then by id", async () => {
    const scopes = await adapter().loadUserScopes();
    const expected = [...scopes].sort(
      (left, right) => left.name.localeCompare(right.name) || left.id.localeCompare(right.id),
    );

    expect(scopes).toEqual(expected);
  });

  it("should filter by scope type", async () => {
    const programs = await adapter().loadUserScopes({ type: "program" });
    const onlyActivities = await adapter().loadUserScopes({ type: "activity" });

    expect(programs).toHaveLength(eventPrograms.length);
    expect(programs.every((scope) => scope.type === "program")).toBe(true);
    expect(onlyActivities).toHaveLength(activities.length);
    expect(onlyActivities.every((scope) => scope.type === "activity")).toBe(true);
  });

  it("should expose the ADMIN semantics: full catalog as LOCAL and unbounded", async () => {
    const scopes = await adapter().loadUserScopes();

    scopes.forEach((scope) => {
      expect(scope.permissions).toHaveLength(PERMISSION_NAMES.length);
      scope.permissions.forEach((permission) => {
        expect(permission.origin).toBe("LOCAL");
        expect(permission.validFrom).toBeNull();
        expect(permission.validUntil).toBeNull();
      });
    });
  });

  it("should return clones so callers cannot mutate the catalog", async () => {
    const mock = adapter();
    const first = await mock.loadUserScopes();

    first[0]!.name = "mutado";
    first[0]!.permissions.length = 0;

    const second = await mock.loadUserScopes();

    expect(second[0]!.name).not.toBe("mutado");
    expect(second[0]!.permissions).toHaveLength(PERMISSION_NAMES.length);
  });
});
