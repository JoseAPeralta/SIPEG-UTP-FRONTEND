import type { RegistrationPayload } from "@/types/domain";

export type RegistrationField =
  "email" | "firstName" | "identificationNumber" | "lastName" | "password";

export type RegistrationErrors = Partial<Record<RegistrationField, string>>;

const EMAIL_PATTERN =
  /^(?:[A-Za-z0-9_'+-]+\.)*[A-Za-z0-9_'+-]*[A-Za-z0-9_+-]@(?:[A-Za-z0-9][A-Za-z0-9-]*\.)+[A-Za-z]{2,}$/;

function validateLength(
  value: string,
  label: string,
  minimum: number,
  maximum: number,
): string | undefined {
  const length = value.trim().length;

  if (length < minimum) {
    return `${label} debe tener al menos ${minimum} caracteres.`;
  }

  if (length > maximum) {
    return `${label} no puede exceder ${maximum} caracteres.`;
  }

  return undefined;
}

export function validateRegistrationPayload(payload: RegistrationPayload): RegistrationErrors {
  const errors: RegistrationErrors = {};
  const firstNameError = validateLength(payload.firstName, "El nombre", 2, 100);
  const identificationNumberError = validateLength(
    payload.identificationNumber,
    "La cédula",
    5,
    30,
  );
  const lastNameError = validateLength(payload.lastName, "El apellido", 2, 100);

  if (firstNameError) errors.firstName = firstNameError;
  if (identificationNumberError) errors.identificationNumber = identificationNumberError;
  if (lastNameError) errors.lastName = lastNameError;

  if (!EMAIL_PATTERN.test(payload.email.trim())) {
    errors.email = "Ingresa un correo electrónico válido.";
  }

  if (payload.password.length < 12) {
    errors.password = "La contraseña debe tener al menos 12 caracteres.";
  } else if (payload.password.length > 128) {
    errors.password = "La contraseña no puede exceder 128 caracteres.";
  }

  return errors;
}
