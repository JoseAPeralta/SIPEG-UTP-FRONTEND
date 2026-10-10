// @vitest-environment node

import { describe, expect, it } from "vitest";

import { toEventProgramMutationFailure } from "./eventProgramFailure";

describe("toEventProgramMutationFailure", () => {
  it.each([
    [400, "invalidRequest"],
    [422, "invalidRequest"],
    [401, "forbidden"],
    [403, "forbidden"],
    [404, "notFound"],
    [409, "conflict"],
    [500, "unknown"],
    [0, "unknown"],
  ] as const)("maps status %i to %s", (status, expected) => {
    expect(toEventProgramMutationFailure(Object.assign(new Error("detail"), { status }))).toBe(
      expected,
    );
  });

  it("maps unknown errors without a status", () => {
    expect(toEventProgramMutationFailure(new Error("network"))).toBe("unknown");
    expect(toEventProgramMutationFailure(null)).toBe("unknown");
  });
});
