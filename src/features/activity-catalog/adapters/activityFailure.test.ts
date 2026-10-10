// @vitest-environment node

import { describe, expect, it } from "vitest";

import { toActivityMutationFailure } from "./activityFailure";

describe("toActivityMutationFailure", () => {
  it("should map the documented statuses and fall back to unknown", () => {
    expect(toActivityMutationFailure({ status: 400 })).toBe("invalidRequest");
    expect(toActivityMutationFailure({ status: 422 })).toBe("invalidRequest");
    expect(toActivityMutationFailure({ status: 401 })).toBe("forbidden");
    expect(toActivityMutationFailure({ status: 403 })).toBe("forbidden");
    expect(toActivityMutationFailure({ status: 404 })).toBe("notFound");
    expect(toActivityMutationFailure({ status: 409 })).toBe("conflict");
    expect(toActivityMutationFailure(new Error("red"))).toBe("unknown");
    expect(toActivityMutationFailure(null)).toBe("unknown");
  });
});
