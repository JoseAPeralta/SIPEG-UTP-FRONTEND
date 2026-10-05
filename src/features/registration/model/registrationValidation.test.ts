// @vitest-environment node

import { describe, expect, it } from "vitest";

import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  validateRegistrationPayload,
} from "./registrationValidation";

function createPayload(password: string) {
  return {
    careerId: "software",
    email: "persona@example.edu",
    firstName: "Maria",
    identificationNumber: "8-123-456",
    lastName: "Perez",
    password,
    unitId: "fisc",
  };
}

const validPassword = "Clave segura 2026";

describe("validateRegistrationPayload", () => {
  it("should require at least the contract minimum of 12 characters", () => {
    expect(validateRegistrationPayload(createPayload("a".repeat(11)))).toEqual({
      password: "La contraseña debe tener al menos 12 caracteres.",
    });
  });

  it("should accept exactly 12 characters", () => {
    expect(validateRegistrationPayload(createPayload("a".repeat(12)))).toEqual({});
  });

  it("should accept exactly the contract maximum of 20 characters", () => {
    expect(validateRegistrationPayload(createPayload("a".repeat(20)))).toEqual({});
  });

  it("should reject 21 characters with the contract maximum in the message", () => {
    expect(validateRegistrationPayload(createPayload("a".repeat(21)))).toEqual({
      password: "La contraseña no puede exceder 20 caracteres.",
    });
  });

  it("should expose the contract boundaries as a single source of truth", () => {
    expect(PASSWORD_MIN_LENGTH).toBe(12);
    expect(PASSWORD_MAX_LENGTH).toBe(20);
  });

  it("should not trim the password when measuring its length", () => {
    // 20 characters including spaces; trimming would leave 10 and wrongly fail the minimum.
    expect(validateRegistrationPayload(createPayload(" a".repeat(10)))).toEqual({});
    expect(validateRegistrationPayload(createPayload(`${"a".repeat(22)}  `))).toEqual({
      password: "La contraseña no puede exceder 20 caracteres.",
    });
  });

  it("should keep validating the other contract fields", () => {
    expect(
      validateRegistrationPayload({ ...createPayload(validPassword), email: "persona" }),
    ).toEqual({ email: "Ingrese un correo electrónico válido." });

    expect(
      validateRegistrationPayload({ ...createPayload(validPassword), firstName: "M" }),
    ).toEqual({ firstName: "El nombre debe tener al menos 2 caracteres." });
  });
});
