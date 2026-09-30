import { useMutation } from "@tanstack/react-query";

import { useAppAdapters } from "@/app/adapters";
import type { PasswordResetPayload, PasswordResetRequest } from "@/app/adapters/contracts";

import {
  toPasswordRecoveryError,
  type PasswordRecoveryFailure,
} from "../adapters/passwordRecoveryFailure";

function readFailure(error: unknown): PasswordRecoveryFailure | null {
  return error ? toPasswordRecoveryError(error).failure : null;
}

export function useRequestPasswordReset() {
  const { auth } = useAppAdapters();
  const mutation = useMutation({
    mutationFn: async (request: PasswordResetRequest) => {
      try {
        await auth.requestPasswordReset(request);
      } catch (error) {
        throw toPasswordRecoveryError(error);
      }
    },
  });

  return {
    failure: readFailure(mutation.error),
    isPending: mutation.isPending,
    isSuccess: mutation.isSuccess,
    requestPasswordReset: mutation.mutateAsync,
  };
}

export function useResetPassword() {
  const { auth } = useAppAdapters();
  const mutation = useMutation({
    mutationFn: async (payload: PasswordResetPayload) => {
      try {
        await auth.resetPassword(payload);
      } catch (error) {
        throw toPasswordRecoveryError(error);
      }
    },
  });

  return {
    failure: readFailure(mutation.error),
    isPending: mutation.isPending,
    isSuccess: mutation.isSuccess,
    resetPassword: mutation.mutateAsync,
  };
}
