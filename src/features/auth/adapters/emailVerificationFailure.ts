import { ApiError } from "@/app/adapters/http/apiClient";

/** Product vocabulary for the documented `POST /api/v1/auth/verify-email` outcomes. */
export type EmailVerificationFailure = "invalidLink" | "throttled" | "unavailable" | "unknown";

const FAILURE_MESSAGES: Record<EmailVerificationFailure, string> = {
  invalidLink: "No fue posible activar su cuenta. Solicite un nuevo correo de verificacion.",
  throttled: "Ha realizado demasiados intentos. Espere un momento e intente de nuevo.",
  unavailable: "No se pudo completar la solicitud. Intente de nuevo en unos minutos.",
  unknown: "No fue posible activar su cuenta. Intente de nuevo en unos minutos.",
};

export class EmailVerificationError extends Error {
  readonly failure: EmailVerificationFailure;

  constructor(failure: EmailVerificationFailure) {
    super(FAILURE_MESSAGES[failure]);
    this.failure = failure;
    this.name = "EmailVerificationError";
  }
}

/**
 * Translates the verification outcome into product vocabulary. The backend message is dropped: it may
 * describe why a single token failed, and the UI owns its own localized copy.
 */
export function toEmailVerificationError(error: unknown): EmailVerificationError {
  if (error instanceof EmailVerificationError) {
    return error;
  }

  if (error instanceof ApiError) {
    if (error.status === 0 || error.status >= 500) {
      return new EmailVerificationError("unavailable");
    }

    if (error.status === 400) {
      return new EmailVerificationError("invalidLink");
    }

    if (error.status === 429) {
      return new EmailVerificationError("throttled");
    }
  }

  return new EmailVerificationError("unknown");
}
