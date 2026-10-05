export type OrganizationalUnitFailure =
  "conflict" | "forbidden" | "invalidRequest" | "notFound" | "unknown";

/**
 * Traduce el estado HTTP a una categoria que cada vista explica con su propio copy. El `409` no
 * distingue motivo en el contrato, asi que la vista de unidades nombra el suyo: el programa
 * predeterminado con actividades programadas o en curso.
 */
export function toOrganizationalUnitFailure(error: unknown): OrganizationalUnitFailure {
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
