export const PASSWORD_RESET_MIN_LENGTH = 12;
export const PASSWORD_RESET_MAX_LENGTH = 20;

const EMAIL_PATTERN =
  /^(?:[A-Za-z0-9_'+-]+\.)*[A-Za-z0-9_'+-]*[A-Za-z0-9_+-]@(?:[A-Za-z0-9][A-Za-z0-9-]*\.)+[A-Za-z]{2,}$/;

export type NewPasswordErrors = Partial<Record<"confirmPassword" | "newPassword", string>>;
export type PasswordResetRequestValidation = {
  email: string | null;
  error: string | null;
};

export function isValidEmail(value: string) {
  return EMAIL_PATTERN.test(value.trim());
}

export function validatePasswordResetRequest({
  email,
}: {
  email: string;
}): PasswordResetRequestValidation {
  return isValidEmail(email)
    ? { email: email.trim(), error: null }
    : { email: null, error: "Ingrese un correo electrónico válido." };
}

export function validateNewPassword({
  confirmPassword,
  newPassword,
}: {
  confirmPassword: string;
  newPassword: string;
}): NewPasswordErrors {
  if (newPassword.length < PASSWORD_RESET_MIN_LENGTH) {
    return {
      newPassword: `La contraseña debe tener al menos ${PASSWORD_RESET_MIN_LENGTH} caracteres.`,
    };
  }

  if (newPassword.length > PASSWORD_RESET_MAX_LENGTH) {
    return {
      newPassword: `La contraseña no puede exceder ${PASSWORD_RESET_MAX_LENGTH} caracteres.`,
    };
  }

  if (confirmPassword !== newPassword) {
    return { confirmPassword: "Las contraseñas no coinciden." };
  }

  return {};
}
