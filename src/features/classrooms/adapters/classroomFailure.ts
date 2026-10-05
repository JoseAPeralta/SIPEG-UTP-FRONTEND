export type ClassroomFailure = "conflict" | "forbidden" | "invalidRequest" | "notFound" | "unknown";

/**
 * Traduce el estado HTTP a una categoria de fallo que las vistas pueden explicar con su propio
 * copy. No distingue tipos de `409` porque el contrato no lo hace: el backend decide que un aula
 * ocupada, una amenidad repetida y un solape comparten codigo, asi que cada vista nombra su propio
 * conflicto en lugar de exponer un detalle interno que podria no ser cierto.
 */
export function toClassroomFailure(error: unknown): ClassroomFailure {
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
