// @vitest-environment node

import { describe, expect, it } from "vitest";

import { toOrganizationalUnitFailure } from "./organizationalUnitFailure";

describe("toOrganizationalUnitFailure", () => {
  it.each([
    [400, "invalidRequest"],
    [403, "forbidden"],
    [404, "notFound"],
    [409, "conflict"],
    [500, "unknown"],
  ] as const)("maps status %i to %s", (status, expected) => {
    expect(toOrganizationalUnitFailure({ status })).toBe(expected);
  });

  it("maps an unrecognized error to unknown", () => {
    expect(toOrganizationalUnitFailure(new Error("boom"))).toBe("unknown");
  });
});
