import { describe, expect, it } from "vitest";

import { ApiError } from "@/app/adapters/http/apiClient";

import { ProfileUpdateError, toProfileUpdateError } from "./profileUpdateFailure";

describe("toProfileUpdateError", () => {
  it.each([
    [400, "invalid"],
    [401, "unauthenticated"],
    [404, "notFound"],
    [409, "conflict"],
    [500, "unknown"],
  ])("should translate the %i response into the %s failure", (status, failure) => {
    const error = toProfileUpdateError(new ApiError("unit is not available", status));

    expect(error).toBeInstanceOf(ProfileUpdateError);
    expect(error.failure).toBe(failure);
  });

  it("should keep an already classified failure", () => {
    const error = toProfileUpdateError(new ProfileUpdateError("conflict"));

    expect(error.failure).toBe("conflict");
  });

  it("should wrap a foreign error as unknown without exposing its message", () => {
    const error = toProfileUpdateError(new Error("career table missing"));

    expect(error.failure).toBe("unknown");
    expect(error.message).not.toContain("career table missing");
  });
});
