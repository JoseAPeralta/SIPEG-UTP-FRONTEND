import { describe, expect, it } from "vitest";

import { activityStatusLabels, eventProgramStatusLabels } from "./catalogLabels";
import { activityTypeFilterOrder, activityTypeLabels } from "./catalogSelectors";

function expectSpanishLabels(labels: Record<string, string>) {
  const entries = Object.entries(labels);

  expect(entries.length).toBeGreaterThan(0);

  entries.forEach(([code, label]) => {
    expect(label.trim(), `${code} debe tener etiqueta`).not.toBe("");
    expect(label, `${code} no debe mostrar el codigo`).not.toBe(code);
  });
}

describe("catalogLabels", () => {
  it("should label every activity type in Spanish", () => {
    expectSpanishLabels(activityTypeLabels);
  });

  it("should label every activity and event program status in Spanish", () => {
    expectSpanishLabels(activityStatusLabels);
    expectSpanishLabels(eventProgramStatusLabels);
  });

  it("should keep the activity type filter in the expected order", () => {
    expect(activityTypeFilterOrder).toEqual([
      "TALK",
      "CONFERENCE",
      "SEMINAR",
      "WORKSHOP",
      "COURSE",
      "PANEL",
      "COMPETITION",
      "OTHER",
    ]);
  });

  it("should cover every activity type exactly once in the filter order", () => {
    const orderedTypes = new Set(activityTypeFilterOrder);

    expect(orderedTypes.size).toBe(activityTypeFilterOrder.length);
    expect([...orderedTypes].sort()).toEqual(Object.keys(activityTypeLabels).sort());
  });
});
