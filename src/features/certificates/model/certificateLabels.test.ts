// @vitest-environment node

import { describe, expect, it } from "vitest";

import { certificateStatusLabels } from "./certificateLabels";

describe("certificateStatusLabels", () => {
  it("should label every certificate status in Spanish", () => {
    Object.entries(certificateStatusLabels).forEach(([code, label]) => {
      expect(label.trim()).not.toBe("");
      expect(label).not.toBe(code);
    });
  });
});
