import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useAppAdapters } from "@/app/adapters";
import type { ProfileUpdateRequest } from "@/app/adapters/contracts";
import { useSessionStore } from "@/store/session";

import {
  ProfileUpdateError,
  toProfileUpdateError,
  type ProfileUpdateFailure,
} from "../adapters/profileUpdateFailure";
import { endAuthSession } from "../model/endAuthSession";

function readFailure(error: unknown): ProfileUpdateFailure | null {
  return error ? toProfileUpdateError(error).failure : null;
}

/**
 * Updates the authenticated profile. The access token is read from the session store at submission
 * time so a rotated token is always used, and only the profile is replaced afterwards: the backend
 * response is authoritative for the unit, career and names it applied. The private profile is never
 * written to a query key, a cache or storage.
 */
export function useProfile() {
  const { auth } = useAppAdapters();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (request: ProfileUpdateRequest) => {
      const { tokens } = useSessionStore.getState();

      if (!tokens) {
        throw new ProfileUpdateError("unauthenticated");
      }

      try {
        return await auth.updateCurrentUser(tokens.accessToken, request);
      } catch (error) {
        const failure = toProfileUpdateError(error);

        if (failure.failure === "unauthenticated") {
          endAuthSession(queryClient, "expired");
        }

        throw failure;
      }
    },
    onSuccess: (currentUser) => {
      useSessionStore.getState().replaceCurrentUser(currentUser);
    },
  });

  return {
    failure: readFailure(mutation.error),
    isPending: mutation.isPending,
    isSuccess: mutation.isSuccess,
    updateProfile: mutation.mutateAsync,
  };
}
