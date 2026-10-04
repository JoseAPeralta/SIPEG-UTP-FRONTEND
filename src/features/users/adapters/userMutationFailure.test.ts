import { describe, expect, it } from "vitest";

import { toUserMutationFailure } from "./userMutationFailure";

function errorWithStatus(status: number) {
  return Object.assign(new Error("fallo"), { status });
}

describe("toUserMutationFailure", () => {
  it("should classify a validation failure", () => {
    expect(toUserMutationFailure(errorWithStatus(400))).toBe("invalidRequest");
  });

  it("should classify a forbidden failure", () => {
    expect(toUserMutationFailure(errorWithStatus(403))).toBe("forbidden");
  });

  it("should classify a missing resource", () => {
    expect(toUserMutationFailure(errorWithStatus(404))).toBe("notFound");
  });

  it("should classify a conflict", () => {
    expect(toUserMutationFailure(errorWithStatus(409))).toBe("conflict");
  });

  it("should fall back to unknown for an unexpected failure", () => {
    expect(toUserMutationFailure(new Error("red caida"))).toBe("unknown");
  });
});
