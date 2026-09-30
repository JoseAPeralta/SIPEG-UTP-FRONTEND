import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useAppAdapters } from "@/app/adapters";
import type { PasswordChangeRequest } from "@/app/adapters/contracts";
import { useSessionStore } from "@/store/session";

import {
  PasswordChangeError,
  toPasswordChangeError,
  type PasswordChangeFailure,
} from "../adapters/passwordChangeFailure";
import { endAuthSession } from "../model/endAuthSession";

function readFailure(error: unknown): PasswordChangeFailure | null {
  return error ? toPasswordChangeError(error).failure : null;
}

/**
 * Changes the password of the current session. Credentials are read from the session store at
 * submission time so a rotated token pair is always used, and the current session is deliberately
 * preserved: the backend keeps the session named by the refresh token it receives.
 */
export function useChangePassword() {
  const { auth } = useAppAdapters();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (request: PasswordChangeRequest) => {
      const { tokens } = useSessionStore.getState();

      if (!tokens) {
        throw toPasswordChangeError(new PasswordChangeError("unauthenticated"));
      }

      try {
        await auth.changePassword(tokens.accessToken, {
          ...request,
          refreshToken: tokens.refreshToken,
        });
      } catch (error) {
        const failure = toPasswordChangeError(error);

        if (failure.failure === "unauthenticated") {
          endAuthSession(queryClient, "expired");
        }

        throw failure;
      }
    },
  });

  return {
    changePassword: mutation.mutateAsync,
    failure: readFailure(mutation.error),
    isPending: mutation.isPending,
    isSuccess: mutation.isSuccess,
  };
}
