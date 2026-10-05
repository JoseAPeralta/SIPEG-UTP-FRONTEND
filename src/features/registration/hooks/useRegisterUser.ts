import { useMutation } from "@tanstack/react-query";

import { useAppAdapters } from "@/app/adapters";
import type { RegistrationPayload } from "@/types/domain";

import { RegistrationError, toRegistrationError } from "../adapters/registrationFailure";

export function useRegisterUser() {
  const { registration } = useAppAdapters();
  const mutation = useMutation({
    mutationFn: async (payload: RegistrationPayload) => {
      try {
        return await registration.register(payload);
      } catch (error) {
        throw toRegistrationError(error);
      }
    },
  });

  return {
    errorMessage: mutation.error instanceof RegistrationError ? mutation.error.message : null,
    failure: mutation.error instanceof RegistrationError ? mutation.error.failure : null,
    isPending: mutation.isPending,
    register: mutation.mutateAsync,
    result: mutation.data ?? null,
  };
}
