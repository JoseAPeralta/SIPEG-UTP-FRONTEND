import { ApiError } from "@/app/adapters/http/apiClient";

export type PasswordChangeFailure =
  "forbidden" | "invalid" | "throttled" | "unauthenticated" | "unknown";

const FAILURE_MESSAGES: Record<PasswordChangeFailure, string> = {
  forbidden: "No tiene permiso para cambiar la contraseña de esta cuenta.",
  invalid: "No fue posible validar el cambio con la contraseña actual.",
  throttled: "Ha realizado demasiados intentos. Espere un momento e intente de nuevo.",
  unauthenticated: "Su sesión no está autorizada. Inicie sesión nuevamente para continuar.",
  unknown: "No fue posible cambiar la contraseña. Intente de nuevo en unos minutos.",
};

const STATUS_FAILURES: Partial<Record<number, PasswordChangeFailure>> = {
  400: "invalid",
  401: "unauthenticated",
  403: "forbidden",
  429: "throttled",
};

export class PasswordChangeError extends Error {
  readonly failure: PasswordChangeFailure;

  constructor(failure: PasswordChangeFailure) {
    super(FAILURE_MESSAGES[failure]);
    this.name = "PasswordChangeError";
    this.failure = failure;
  }
}

/**
 * Translates an HTTP outcome into password-change vocabulary so hooks and pages never depend on
 * `ApiError` or on backend wording. The `400` response is intentionally not split: a wrong current
 * password, a foreign refresh token and a validation failure are indistinguishable by contract.
 */
export function toPasswordChangeError(error: unknown): PasswordChangeError {
  if (error instanceof PasswordChangeError) {
    return error;
  }

  if (error instanceof ApiError) {
    return new PasswordChangeError(STATUS_FAILURES[error.status] ?? "unknown");
  }

  return new PasswordChangeError("unknown");
}
