// @vitest-environment node

import { describe, expect, it } from "vitest";

import { createActivity } from "@/test/factories";

import { toActivitySummary } from "./activitySummary";

describe("toActivitySummary", () => {
  it("should exclude the fields that only the detail contract exposes", () => {
    const summary = toActivitySummary(createActivity());

    for (const field of ["cancelReason", "checkedInCount", "enrolledCount", "equipment"]) {
      expect(summary).not.toHaveProperty(field);
    }
  });

  it("should keep the listing fields and isolate the speaker list", () => {
    const source = createActivity({
      speakers: [{ firstName: "Ana", id: "speaker-ana", lastName: "Perez" }],
    });
    const summary = toActivitySummary(source);

    expect(summary).toMatchObject({
      eventProgramId: "program-1",
      id: "activity-1",
      name: "Actividad de prueba",
      speakers: [{ firstName: "Ana", id: "speaker-ana", lastName: "Perez" }],
      status: "SCHEDULED",
    });

    summary.speakers[0]!.firstName = "Mutado";
    expect(source.speakers[0]!.firstName).toBe("Ana");
  });
});
