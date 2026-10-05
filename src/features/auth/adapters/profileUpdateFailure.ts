import { ApiError } from "@/app/adapters/http/apiClient";

/** Product vocabulary for the documented profile PATCH responses. */
export type ProfileUpdateFailure =
  "conflict" | "invalid" | "notFound" | "unauthenticated" | "unknown";

const STATUS_FAILURES: Partial<Record<number, ProfileUpdateFailure>> = {
  400: "invalid",
  401: "unauthenticated",
  404: "notFound",
  409: "conflict",
};

export class ProfileUpdateError extends Error {
  readonly failure: ProfileUpdateFailure;

  constructor(failure: ProfileUpdateFailure) {
    super(`Profile update failed: ${failure}`);
    this.failure = failure;
    this.name = "ProfileUpdateError";
  }
}

/**
 * Maps a transport or adapter failure to a status-based product failure. The backend message is
 * deliberately dropped: it may describe internals the user should not read, and the UI owns its own
 * localized copy.
 */
export function toProfileUpdateError(error: unknown): ProfileUpdateError {
  if (error instanceof ProfileUpdateError) {
    return error;
  }

  if (error instanceof ApiError) {
    return new ProfileUpdateError(STATUS_FAILURES[error.status] ?? "unknown");
  }

  return new ProfileUpdateError("unknown");
}
