import { ApiError } from "@/app/adapters/http/apiClient";

/**
 * Product vocabulary for the documented login and refresh outcomes. `rejected` intentionally covers
 * `401` and `403`: the contract does not distinguish an inactive account, an unverified email and
 * a wrong password, so presenting them differently would either leak account state or guess.
 */
export type AuthFailure = "rejected" | "throttled" | "unavailable" | "unknown";

const FAILURE_MESSAGES: Record<AuthFailure, string> = {
  rejected: "No fue posible iniciar sesion. Verifique sus datos de acceso e intente de nuevo.",
  throttled: "Ha realizado demasiados intentos. Espere un momento e intente de nuevo.",
  unavailable: "No se pudo completar la solicitud. Intente de nuevo en unos minutos.",
  unknown: "No fue posible iniciar sesion. Intente de nuevo en unos minutos.",
};

const STATUS_FAILURES: Partial<Record<number, AuthFailure>> = {
  400: "rejected",
  401: "rejected",
  403: "rejected",
  429: "throttled",
};

export class AuthError extends Error {
  readonly failure: AuthFailure;

  constructor(failure: AuthFailure) {
    super(FAILURE_MESSAGES[failure]);
    this.failure = failure;
    this.name = "AuthError";
  }
}

/**
 * Translates a transport or adapter failure into authentication vocabulary. The backend message is
 * dropped on purpose: it may describe account state, identifiers or internals, and the UI owns its
 * own localized copy.
 */
export function toAuthError(error: unknown): AuthError {
  if (error instanceof AuthError) {
    return error;
  }

  if (error instanceof ApiError) {
    if (error.status === 0 || error.status >= 500) {
      return new AuthError("unavailable");
    }

    return new AuthError(STATUS_FAILURES[error.status] ?? "unknown");
  }

  return new AuthError("unknown");
}
