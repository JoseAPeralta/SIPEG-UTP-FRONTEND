import { describe, expect, it } from "vitest";

import { classroomTypeLabels } from "./classroomLabels";

describe("classroomTypeLabels", () => {
  it("should label every classroom type in Spanish", () => {
    Object.entries(classroomTypeLabels).forEach(([code, label]) => {
      expect(label.trim()).not.toBe("");
      expect(label).not.toBe(code);
    });
  });
});
