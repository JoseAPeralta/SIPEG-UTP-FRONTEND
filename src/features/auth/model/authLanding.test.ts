// @vitest-environment node

import { describe, expect, it } from "vitest";

import { resolveAuthLandingPath } from "./authLanding";

describe("resolveAuthLandingPath", () => {
  it("should send administrators to the operational panel", () => {
    expect(resolveAuthLandingPath("ADMIN")).toBe("/admin");
  });

  it("should send standard users to their personal area", () => {
    expect(resolveAuthLandingPath("USER")).toBe("/perfil");
  });
});
