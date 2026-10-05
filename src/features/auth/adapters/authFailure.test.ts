// @vitest-environment node

import { describe, expect, it } from "vitest";

import { ApiError } from "@/app/adapters/http/apiClient";

import { AuthError, toAuthError } from "./authFailure";

describe("toAuthError", () => {
  it("should treat an unauthorized and a forbidden login as the same failure", () => {
    expect(toAuthError(new ApiError("La solicitud no es valida.", 401)).failure).toBe("rejected");
    expect(toAuthError(new ApiError("No tiene permisos.", 403)).failure).toBe("rejected");
  });

  it("should keep the same message for an unauthorized and a forbidden login", () => {
    expect(toAuthError(new ApiError("backend interno A", 401)).message).toBe(
      toAuthError(new ApiError("backend interno B", 403)).message,
    );
  });

  it("should never expose the backend message", () => {
    const error = toAuthError(new ApiError("Inactive account: user_id=42", 401));

    expect(error.message).not.toContain("Inactive");
    expect(error.message).not.toContain("42");
  });

  it("should classify throttling", () => {
    expect(toAuthError(new ApiError("Too many requests.", 429)).failure).toBe("throttled");
  });

  it("should classify a rejected request without credentials as a failed attempt", () => {
    expect(toAuthError(new ApiError("La solicitud no es valida.", 400)).failure).toBe("rejected");
  });

  it("should classify connectivity and server failures as unavailable", () => {
    expect(toAuthError(new ApiError("sin conexion", 0)).failure).toBe("unavailable");
    expect(toAuthError(new ApiError("error", 500)).failure).toBe("unavailable");
    expect(toAuthError(new ApiError("error", 503)).failure).toBe("unavailable");
  });

  it("should classify an untyped error as unknown", () => {
    expect(toAuthError(new Error("boom")).failure).toBe("unknown");
  });

  it("should return the same instance when it is already an AuthError", () => {
    const error = new AuthError("throttled");

    expect(toAuthError(error)).toBe(error);
  });

  it("should publish a message for every failure", () => {
    const messages = (["rejected", "throttled", "unavailable", "unknown"] as const).map(
      (failure) => toAuthError(new AuthError(failure)).message,
    );

    expect(new Set(messages).size).toBe(messages.length);
    expect(messages.every((message) => message.trim().length > 0)).toBe(true);
  });
});
