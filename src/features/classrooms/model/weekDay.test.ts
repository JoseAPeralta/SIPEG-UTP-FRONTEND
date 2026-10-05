// @vitest-environment node

import { describe, expect, it } from "vitest";

import { weekDayLabels } from "./weekDay";

describe("weekDayLabels", () => {
  it("should cover the seven ISO days in institutional order", () => {
    expect(weekDayLabels).toEqual([
      { day: 1, label: "Lunes" },
      { day: 2, label: "Martes" },
      { day: 3, label: "Miercoles" },
      { day: 4, label: "Jueves" },
      { day: 5, label: "Viernes" },
      { day: 6, label: "Sabado" },
      { day: 7, label: "Domingo" },
    ]);
  });

  it("should label every ISO day in Spanish", () => {
    expect(weekDayLabels.map((weekDay) => weekDay.label)).toHaveLength(7);
    for (const weekDay of weekDayLabels) {
      expect(weekDay.label.trim()).not.toBe("");
      expect(weekDay.label).not.toBe(String(weekDay.day));
    }
  });
});
