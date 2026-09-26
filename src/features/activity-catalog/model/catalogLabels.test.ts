import { describe, expect, it } from "vitest";

import { activityStatusLabels, eventProgramStatusLabels } from "./catalogLabels";
import { activityTypeLabels } from "./catalogSelectors";

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
});
