import { useMutation } from "@tanstack/react-query";

import { useAppAdapters } from "@/app/adapters";

import {
  EmailVerificationError,
  toEmailVerificationError,
} from "../adapters/emailVerificationFailure";

export function useVerifyEmail() {
  const { auth } = useAppAdapters();
  const mutation = useMutation({
    mutationFn: async (token: string) => {
      try {
        await auth.verifyEmail(token);
      } catch (error) {
        throw toEmailVerificationError(error);
      }
    },
  });

  return {
    errorMessage: mutation.error instanceof EmailVerificationError ? mutation.error.message : null,
    failure: mutation.error instanceof EmailVerificationError ? mutation.error.failure : null,
    isPending: mutation.isPending,
    verify: mutation.mutateAsync,
  };
}
