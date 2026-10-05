// @vitest-environment node

import { describe, expect, it } from "vitest";

import { globalRoleLabels } from "./userLabels";

describe("globalRoleLabels", () => {
  it("should label every user role in Spanish", () => {
    Object.entries(globalRoleLabels).forEach(([code, label]) => {
      expect(label.trim()).not.toBe("");
      expect(label).not.toBe(code);
    });
  });
});
