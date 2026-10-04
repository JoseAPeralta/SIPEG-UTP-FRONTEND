import { describe, expect, it } from "vitest";

import { ApiError } from "@/app/adapters/http/apiClient";

import { toCareerMutationFailure } from "./careerMutationFailure";

describe("toCareerMutationFailure", () => {
  it("maps the documented conflict and validation statuses without retaining backend copy", () => {
    expect(toCareerMutationFailure(new ApiError("private", 400))).toBe("invalidUnit");
    expect(toCareerMutationFailure(new ApiError("private", 409))).toBe("conflict");
  });
});
