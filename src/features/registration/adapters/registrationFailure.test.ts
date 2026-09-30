import { describe, expect, it } from "vitest";

import { ApiError } from "@/app/adapters/http/apiClient";

import { RegistrationError, toRegistrationError } from "./registrationFailure";

describe("toRegistrationError", () => {
  it("should answer a duplicate with the same message as an invalid request", () => {
    const conflict = toRegistrationError(new ApiError("Email already registered.", 409));
    const invalid = toRegistrationError(new ApiError("body.email invalid", 400));

    expect(conflict.failure).toBe("conflict");
    expect(invalid.failure).toBe("conflict");
    expect(conflict.message).toBe(invalid.message);
  });

  it("should not disclose which attribute already exists", () => {
    const error = toRegistrationError(
      new ApiError("Email mariana@example.edu already registered", 409),
    );

    expect(error.message).not.toContain("mariana");
    expect(error.message).not.toContain("@example.edu");
    expect(error.message).not.toMatch(/ya existe|registrad|duplicad/i);
  });

  it("should classify throttling separately", () => {
    expect(toRegistrationError(new ApiError("Too many requests.", 429)).failure).toBe("throttled");
  });

  it("should classify connectivity and server failures as unavailable", () => {
    expect(toRegistrationError(new ApiError("sin conexion", 0)).failure).toBe("unavailable");
    expect(toRegistrationError(new ApiError("error", 500)).failure).toBe("unavailable");
  });

  it("should classify an untyped error as unknown", () => {
    expect(toRegistrationError(new Error("boom")).failure).toBe("unknown");
  });

  it("should return the same instance when it is already typed", () => {
    const error = new RegistrationError("throttled");

    expect(toRegistrationError(error)).toBe(error);
  });

  it("should publish a message for every failure", () => {
    const messages = (["conflict", "throttled", "unavailable", "unknown"] as const).map(
      (failure) => new RegistrationError(failure).message,
    );

    expect(new Set(messages).size).toBe(messages.length);
  });
});
