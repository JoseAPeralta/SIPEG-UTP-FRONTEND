export type UserMutationFailure =
  "conflict" | "forbidden" | "invalidRequest" | "notFound" | "unknown";

/**
 * Traduce el estado HTTP a una categoria que las vistas explican con su propio copy. No distingue
 * los distintos `409` (duplicado, autodesactivacion o ultimo administrador) porque el contrato
 * tampoco lo hace; cada operacion nombra sus causas posibles sin exponer el mensaje del backend.
 */
export function toUserMutationFailure(error: unknown): UserMutationFailure {
  const status =
    typeof error === "object" && error !== null && "status" in error
      ? (error as { status?: unknown }).status
      : undefined;

  if (status === 400) return "invalidRequest";
  if (status === 403) return "forbidden";
  if (status === 404) return "notFound";
  if (status === 409) return "conflict";

  return "unknown";
}
