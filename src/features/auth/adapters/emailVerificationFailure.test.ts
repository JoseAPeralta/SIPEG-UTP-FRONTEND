import { describe, expect, it } from "vitest";

import { ApiError } from "@/app/adapters/http/apiClient";

import { EmailVerificationError, toEmailVerificationError } from "./emailVerificationFailure";

describe("toEmailVerificationError", () => {
  it("should classify an invalid or already used token", () => {
    expect(toEmailVerificationError(new ApiError("Token invalido.", 400)).failure).toBe(
      "invalidLink",
    );
  });

  it("should classify throttling separately from an invalid link", () => {
    expect(toEmailVerificationError(new ApiError("Too many requests.", 429)).failure).toBe(
      "throttled",
    );
  });

  it("should classify connectivity and server failures as unavailable", () => {
    expect(toEmailVerificationError(new ApiError("sin conexion", 0)).failure).toBe("unavailable");
    expect(toEmailVerificationError(new ApiError("error", 500)).failure).toBe("unavailable");
  });

  it("should never expose the backend message", () => {
    const error = toEmailVerificationError(new ApiError("Token expirado para user_id=42", 400));

    expect(error.message).not.toContain("42");
  });

  it("should classify an untyped error as unknown", () => {
    expect(toEmailVerificationError(new Error("boom")).failure).toBe("unknown");
  });

  it("should return the same instance when it is already typed", () => {
    const error = new EmailVerificationError("throttled");

    expect(toEmailVerificationError(error)).toBe(error);
  });

  it("should publish a distinct message for every failure", () => {
    const messages = (["invalidLink", "throttled", "unavailable", "unknown"] as const).map(
      (failure) => new EmailVerificationError(failure).message,
    );

    expect(new Set(messages).size).toBe(messages.length);
  });
});
