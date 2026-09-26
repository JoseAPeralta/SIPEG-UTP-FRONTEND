import { describe, expect, it } from "vitest";

import {
  buildWorkingContextOptions,
  parseWorkingContext,
  resolveWorkingScope,
  serializeWorkingContext,
  type WorkingContext,
} from "./workingContext";
import {
  createActivity,
  createCatalog,
  createEventProgram,
  createOrganizationalUnit,
} from "@/test/factories";

const catalog = createCatalog({
  activities: [
    createActivity({ eventProgramId: "program-1", id: "activity-1", name: "Actividad uno" }),
    createActivity({ eventProgramId: "program-1", id: "activity-2", name: "Actividad dos" }),
    createActivity({ eventProgramId: "program-2", id: "activity-3", name: "Actividad tres" }),
  ],
  eventPrograms: [
    createEventProgram({ id: "program-1", label: "Semana de innovacion" }),
    createEventProgram({ id: "program-2", label: null, name: "Jornadas de investigacion" }),
  ],
  organizationalUnits: [createOrganizationalUnit({ id: "fic" })],
});

describe("resolveWorkingScope", () => {
  it("should return null without a selection", () => {
    expect(resolveWorkingScope(null, catalog)).toBeNull();
  });

  it("should scope every activity of the selected program", () => {
    const scope = resolveWorkingScope({ id: "program-1", kind: "eventProgram" }, catalog);

    expect(scope?.label).toBe("Semana de innovacion");
    expect(scope?.activityIds).toEqual(["activity-1", "activity-2"]);
    expect(scope?.unit.id).toBe("fic");
  });

  it("should fall back to the program name when it has no label", () => {
    const scope = resolveWorkingScope({ id: "program-2", kind: "eventProgram" }, catalog);

    expect(scope?.label).toBe("Jornadas de investigacion");
  });

  it("should scope only the selected activity", () => {
    const scope = resolveWorkingScope({ id: "activity-3", kind: "activity" }, catalog);

    expect(scope?.label).toBe("Actividad tres");
    expect(scope?.activityIds).toEqual(["activity-3"]);
    expect(scope?.program.id).toBe("program-2");
  });

  it("should reject unknown selections", () => {
    expect(resolveWorkingScope({ id: "activity-missing", kind: "activity" }, catalog)).toBeNull();
    expect(
      resolveWorkingScope({ id: "program-missing", kind: "eventProgram" }, catalog),
    ).toBeNull();
  });
});

describe("buildWorkingContextOptions", () => {
  it("should list programs and activities separately", () => {
    const options = buildWorkingContextOptions(catalog);

    expect(options.programs.map((option) => option.id)).toEqual(["program-1", "program-2"]);
    expect(options.activities.map((option) => option.id)).toEqual([
      "activity-1",
      "activity-2",
      "activity-3",
    ]);
  });
});

describe("working context serialization", () => {
  it("should round-trip both selection kinds", () => {
    const program: WorkingContext = { id: "program-1", kind: "eventProgram" };
    const activity: WorkingContext = { id: "activity-1", kind: "activity" };

    expect(parseWorkingContext(serializeWorkingContext(program))).toEqual(program);
    expect(parseWorkingContext(serializeWorkingContext(activity))).toEqual(activity);
  });

  it("should serialize an empty selection as an empty string", () => {
    expect(serializeWorkingContext(null)).toBe("");
    expect(parseWorkingContext("")).toBeNull();
  });

  it("should reject malformed values", () => {
    expect(parseWorkingContext("eventProgram")).toBeNull();
    expect(parseWorkingContext(":activity-1")).toBeNull();
    expect(parseWorkingContext("unknown:activity-1")).toBeNull();
    expect(parseWorkingContext("activity:")).toBeNull();
  });
});
