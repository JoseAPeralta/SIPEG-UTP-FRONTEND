import { describe, expect, it } from "vitest";

import { PASSWORD_RESET_MAX_LENGTH, PASSWORD_RESET_MIN_LENGTH } from "./passwordRecoveryValidation";
import { toPasswordChangeRequest, validatePasswordChange } from "./passwordChangeValidation";

describe("validatePasswordChange", () => {
  it("should accept a valid change", () => {
    expect(
      validatePasswordChange({
        confirmPassword: "Nueva clave 2026",
        currentPassword: "sipeg-demo",
        newPassword: "Nueva clave 2026",
      }),
    ).toEqual({});
  });

  it("should require the current password", () => {
    expect(
      validatePasswordChange({
        confirmPassword: "Nueva clave 2026",
        currentPassword: "   ",
        newPassword: "Nueva clave 2026",
      }),
    ).toEqual({ currentPassword: "Ingrese su contraseña actual." });
  });

  it("should require at least the minimum length for the new password", () => {
    const newPassword = "a".repeat(PASSWORD_RESET_MIN_LENGTH - 1);

    expect(
      validatePasswordChange({
        confirmPassword: newPassword,
        currentPassword: "sipeg-demo",
        newPassword,
      }),
    ).toEqual({
      newPassword: `La contraseña debe tener al menos ${PASSWORD_RESET_MIN_LENGTH} caracteres.`,
    });
  });

  it("should reject a new password longer than the product maximum", () => {
    const newPassword = "a".repeat(PASSWORD_RESET_MAX_LENGTH + 1);

    expect(
      validatePasswordChange({
        confirmPassword: newPassword,
        currentPassword: "sipeg-demo",
        newPassword,
      }),
    ).toEqual({
      newPassword: `La contraseña no puede exceder ${PASSWORD_RESET_MAX_LENGTH} caracteres.`,
    });
  });

  it("should require the confirmation to match", () => {
    expect(
      validatePasswordChange({
        confirmPassword: "Otra clave 2026",
        currentPassword: "sipeg-demo",
        newPassword: "Nueva clave 2026",
      }),
    ).toEqual({ confirmPassword: "Las contraseñas no coinciden." });
  });

  it("should report the missing current password before the new password", () => {
    expect(
      validatePasswordChange({
        confirmPassword: "Nueva clave 2026",
        currentPassword: "",
        newPassword: "corta",
      }),
    ).toEqual({ currentPassword: "Ingrese su contraseña actual." });
  });

  it("should build a request with only the two contracted credentials", () => {
    expect(
      toPasswordChangeRequest({
        confirmPassword: "Nueva clave 2026",
        currentPassword: "sipeg-demo",
        newPassword: "Nueva clave 2026",
      }),
    ).toEqual({ currentPassword: "sipeg-demo", newPassword: "Nueva clave 2026" });
  });

  it("should not expose the confirmation in the request", () => {
    expect(
      Object.keys(
        toPasswordChangeRequest({
          confirmPassword: "Nueva clave 2026",
          currentPassword: "sipeg-demo",
          newPassword: "Nueva clave 2026",
        }),
      ),
    ).toEqual(["currentPassword", "newPassword"]);
  });
});
