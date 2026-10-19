export type ActivityMutationFailure =
  "conflict" | "forbidden" | "invalidRequest" | "notFound" | "unknown";

/** Traduce el status HTTP a una categoria de producto; el mensaje del backend nunca se expone. */
export function toActivityMutationFailure(error: unknown): ActivityMutationFailure {
  const status =
    typeof error === "object" && error !== null && "status" in error
      ? (error as { status?: unknown }).status
      : undefined;
  if (status === 400 || status === 422) return "invalidRequest";
  if (status === 401 || status === 403) return "forbidden";
  if (status === 404) return "notFound";
  if (status === 409) return "conflict";

  return "unknown";
}
