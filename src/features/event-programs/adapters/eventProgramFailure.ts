export type EventProgramMutationFailure =
  "conflict" | "forbidden" | "invalidRequest" | "notFound" | "unknown";

export function toEventProgramMutationFailure(error: unknown): EventProgramMutationFailure {
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
