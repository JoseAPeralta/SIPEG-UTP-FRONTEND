export type CareerMutationFailure = "conflict" | "forbidden" | "invalidUnit" | "unknown";

export function toCareerMutationFailure(error: unknown): CareerMutationFailure {
  const status =
    typeof error === "object" && error !== null && "status" in error
      ? (error as { status?: unknown }).status
      : undefined;
  if (status === 400) return "invalidUnit";
  if (status === 403) return "forbidden";
  if (status === 409) return "conflict";
  return "unknown";
}
