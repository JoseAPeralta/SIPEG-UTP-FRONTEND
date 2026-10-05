// @vitest-environment node

import { describe, expect, it } from "vitest";

import { ApiError } from "@/app/adapters/http/apiClient";

import { PasswordChangeError, toPasswordChangeError } from "./passwordChangeFailure";

describe("toPasswordChangeError", () => {
  it.each([
    [400, "invalid"],
    [401, "unauthenticated"],
    [403, "forbidden"],
    [429, "throttled"],
    [500, "unknown"],
  ])("should translate the %i response into the %s failure", (status, failure) => {
    const error = toPasswordChangeError(new ApiError("current password is invalid", status));

    expect(error).toBeInstanceOf(PasswordChangeError);
    expect(error.failure).toBe(failure);
  });

  it("should keep an already classified failure", () => {
    const classified = new PasswordChangeError("throttled");

    expect(toPasswordChangeError(classified)).toBe(classified);
  });

  it("should translate a foreign error as unknown", () => {
    expect(toPasswordChangeError(new Error("boom")).failure).toBe("unknown");
  });

  it("should never expose the backend message", () => {
    const error = toPasswordChangeError(
      new ApiError("refreshToken must belong to the authenticated user", 400),
    );

    expect(error.message).not.toContain("refreshToken");
    expect(error.message).toMatch(/contraseña actual/i);
  });
});
