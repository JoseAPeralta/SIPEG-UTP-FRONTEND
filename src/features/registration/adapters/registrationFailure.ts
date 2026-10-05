import { ApiError } from "@/app/adapters/http/apiClient";

/** Product vocabulary for the documented `POST /api/v1/auth/register` outcomes. */
export type RegistrationFailure = "conflict" | "throttled" | "unavailable" | "unknown";

const FAILURE_MESSAGES: Record<RegistrationFailure, string> = {
  conflict: "No fue posible crear la cuenta. Verifique los datos e intente de nuevo.",
  throttled: "Ha realizado demasiados intentos. Espere un momento e intente de nuevo.",
  unavailable: "No se pudo completar la solicitud. Intente de nuevo en unos minutos.",
  unknown: "No fue posible crear la cuenta. Intente de nuevo en unos minutos.",
};

export class RegistrationError extends Error {
  readonly failure: RegistrationFailure;

  constructor(failure: RegistrationFailure) {
    super(FAILURE_MESSAGES[failure]);
    this.failure = failure;
    this.name = "RegistrationError";
  }
}

/**
 * Translates the registration outcome into product vocabulary. The `400` and the `409` share one
 * failure on purpose: the `409` reports an attribute that already exists, and naming it would
 * confirm the existence of an account. The backend message is never shown.
 */
export function toRegistrationError(error: unknown): RegistrationError {
  if (error instanceof RegistrationError) {
    return error;
  }

  if (error instanceof ApiError) {
    if (error.status === 0 || error.status >= 500) {
      return new RegistrationError("unavailable");
    }

    if (error.status === 400 || error.status === 409) {
      return new RegistrationError("conflict");
    }

    if (error.status === 429) {
      return new RegistrationError("throttled");
    }
  }

  return new RegistrationError("unknown");
}
