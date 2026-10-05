// @vitest-environment node

import { describe, expect, it } from "vitest";

import { ApiError } from "@/app/adapters/http/apiClient";

import { PasswordRecoveryError, toPasswordRecoveryError } from "./passwordRecoveryFailure";

describe("toPasswordRecoveryError", () => {
  it("should classify a rejected request payload as an invalid link", () => {
    const error = toPasswordRecoveryError(new ApiError("La solicitud no es valida.", 400));

    expect(error).toBeInstanceOf(PasswordRecoveryError);
    expect(error.failure).toBe("invalid");
  });

  it("should classify throttling separately", () => {
    expect(toPasswordRecoveryError(new ApiError("No se pudo completar.", 429)).failure).toBe(
      "throttled",
    );
  });

  it("should classify any other failure as unknown", () => {
    expect(toPasswordRecoveryError(new ApiError("Servidor caido.", 500)).failure).toBe("unknown");
    expect(toPasswordRecoveryError(new Error("boom")).failure).toBe("unknown");
    expect(toPasswordRecoveryError(undefined).failure).toBe("unknown");
  });

  it("should never expose the backend message", () => {
    const error = toPasswordRecoveryError(new ApiError("account_not_found", 400));

    expect(error.message).not.toContain("account_not_found");
    expect(error.message).not.toContain("La solicitud no es valida.");
  });
});
