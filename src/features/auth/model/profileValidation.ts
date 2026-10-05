import type { ProfileUpdateRequest } from "@/app/adapters/contracts";

export const PROFILE_NAME_MIN_LENGTH = 2;
export const PROFILE_NAME_MAX_LENGTH = 100;

export type ProfileNameField = "firstName" | "lastName";

export type ProfileErrors = Partial<Record<ProfileNameField, string>>;

/** Form state of the profile form. An empty `unitId` is the "Otro" option. */
export type ProfileFormValues = {
  careerId: string;
  firstName: string;
  lastName: string;
  unitId: string;
};

function validateName(value: string, label: string): string | undefined {
  const length = value.trim().length;

  if (length < PROFILE_NAME_MIN_LENGTH) {
    return `${label} debe tener al menos ${PROFILE_NAME_MIN_LENGTH} caracteres.`;
  }

  if (length > PROFILE_NAME_MAX_LENGTH) {
    return `${label} no puede exceder ${PROFILE_NAME_MAX_LENGTH} caracteres.`;
  }

  return undefined;
}

/** Mirrors the `minLength: 2` and `maxLength: 100` documented for the profile PATCH. */
export function validateProfileNames(values: ProfileFormValues): ProfileErrors {
  const errors: ProfileErrors = {};
  const firstNameError = validateName(values.firstName, "El nombre");
  const lastNameError = validateName(values.lastName, "El apellido");

  if (firstNameError) {
    errors.firstName = firstNameError;
  }

  if (lastNameError) {
    errors.lastName = lastNameError;
  }

  return errors;
}

/**
 * Builds the contracted patch from the form state. Only modified fields travel, an empty unit becomes
 * the explicit `unitId: null` that selects "Otro", and the career is omitted in that case because the
 * backend forces the global "Otros" career. When the unit changes without a chosen career, `careerId`
 * is omitted too because the backend already clears an incompatible career.
 */
export function toProfileUpdateRequest(
  values: ProfileFormValues,
  original: ProfileUpdateRequest,
): ProfileUpdateRequest {
  const firstName = values.firstName.trim();
  const lastName = values.lastName.trim();
  const request: ProfileUpdateRequest = {};

  if (firstName !== original.firstName) {
    request.firstName = firstName;
  }

  if (lastName !== original.lastName) {
    request.lastName = lastName;
  }

  if (values.unitId !== original.unitId) {
    request.unitId = values.unitId === "" ? null : values.unitId;
  }

  if (values.unitId !== "" && values.careerId !== "" && values.careerId !== original.careerId) {
    request.careerId = values.careerId;
  }

  return request;
}
