import { ApiError } from "@/app/adapters/http/apiClient";

export type PasswordRecoveryFailure = "invalid" | "throttled" | "unknown";

const FAILURE_MESSAGES: Record<PasswordRecoveryFailure, string> = {
  invalid: "No fue posible validar la solicitud de recuperacion.",
  throttled: "El servicio limita temporalmente los intentos de recuperacion.",
  unknown: "No fue posible completar la solicitud de recuperacion.",
};

export class PasswordRecoveryError extends Error {
  readonly failure: PasswordRecoveryFailure;

  constructor(failure: PasswordRecoveryFailure) {
    super(FAILURE_MESSAGES[failure]);
    this.name = "PasswordRecoveryError";
    this.failure = failure;
  }
}

/**
 * Translates an HTTP outcome into password-recovery vocabulary so hooks and pages never depend on
 * `ApiError` or on backend wording.
 */
export function toPasswordRecoveryError(error: unknown): PasswordRecoveryError {
  if (error instanceof PasswordRecoveryError) {
    return error;
  }

  if (error instanceof ApiError) {
    if (error.status === 400) {
      return new PasswordRecoveryError("invalid");
    }

    if (error.status === 429) {
      return new PasswordRecoveryError("throttled");
    }
  }

  return new PasswordRecoveryError("unknown");
}
