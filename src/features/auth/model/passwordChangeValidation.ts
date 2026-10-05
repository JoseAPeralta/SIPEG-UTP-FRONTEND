import type { PasswordChangeRequest } from "@/app/adapters/contracts";

import { validateNewPassword } from "./passwordRecoveryValidation";

export type PasswordChangeErrors = Partial<
  Record<"confirmPassword" | "currentPassword" | "newPassword", string>
>;

export type PasswordChangeFormValues = PasswordChangeRequest & {
  confirmPassword: string;
};

const MISSING_CURRENT_PASSWORD = "Ingrese su contraseña actual.";

/**
 * Applies the password policy shared by registration, recovery and password change. The contract
 * documents `minLength: 12` and `maxLength: 20` for the three operations.
 */
export function validatePasswordChange({
  confirmPassword,
  currentPassword,
  newPassword,
}: PasswordChangeFormValues): PasswordChangeErrors {
  if (!currentPassword.trim()) {
    return { currentPassword: MISSING_CURRENT_PASSWORD };
  }

  return validateNewPassword({ confirmPassword, newPassword });
}

export function toPasswordChangeRequest({
  currentPassword,
  newPassword,
}: PasswordChangeFormValues): PasswordChangeRequest {
  return { currentPassword, newPassword };
}
