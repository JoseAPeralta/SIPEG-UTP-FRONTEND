import { describe, expect, it } from "vitest";

import {
  isValidEmail,
  PASSWORD_RESET_MAX_LENGTH,
  PASSWORD_RESET_MIN_LENGTH,
  validateNewPassword,
  validatePasswordResetRequest,
} from "./passwordRecoveryValidation";

describe("passwordRecoveryValidation", () => {
  it("should accept a contract email and return it trimmed", () => {
    expect(validatePasswordResetRequest({ email: "  persona@example.edu " })).toEqual({
      email: "persona@example.edu",
      error: null,
    });
  });

  it("should reject a malformed email without returning a payload", () => {
    expect(validatePasswordResetRequest({ email: "persona" })).toEqual({
      email: null,
      error: "Ingrese un correo electrónico válido.",
    });
  });

  it("should recognize contract emails", () => {
    expect(isValidEmail(" persona+tag@sub.example.edu ")).toBe(true);
    expect(isValidEmail("persona@example")).toBe(false);
  });

  it("should require at least 12 characters", () => {
    expect(
      validateNewPassword({ confirmPassword: "a".repeat(11), newPassword: "a".repeat(11) }),
    ).toEqual({ newPassword: "La contraseña debe tener al menos 12 caracteres." });
  });

  it("should allow at most 20 characters", () => {
    expect(
      validateNewPassword({ confirmPassword: "a".repeat(21), newPassword: "a".repeat(21) }),
    ).toEqual({ newPassword: "La contraseña no puede exceder 20 caracteres." });
  });

  it("should require the confirmation to match", () => {
    expect(
      validateNewPassword({ confirmPassword: "Nueva clave 2026", newPassword: "Nueva clave 2025" }),
    ).toEqual({ confirmPassword: "Las contraseñas no coinciden." });
  });

  it("should accept a matching password of exactly 20 characters", () => {
    const password = "Nueva clave 2026!!!!";

    expect(password).toHaveLength(PASSWORD_RESET_MAX_LENGTH);
    expect(validateNewPassword({ confirmPassword: password, newPassword: password })).toEqual({});
  });

  it("should accept a matching password of exactly 12 characters", () => {
    const password = "a".repeat(PASSWORD_RESET_MIN_LENGTH);

    expect(validateNewPassword({ confirmPassword: password, newPassword: password })).toEqual({});
  });
});
