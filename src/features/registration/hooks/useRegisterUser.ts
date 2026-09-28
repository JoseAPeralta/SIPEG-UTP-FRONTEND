import { useMutation } from "@tanstack/react-query";

import { useAppAdapters } from "@/app/adapters";
import type { RegistrationPayload } from "@/types/domain";

export function useRegisterUser() {
  const { registration } = useAppAdapters();
  const mutation = useMutation({
    mutationFn: (payload: RegistrationPayload) => registration.register(payload),
  });

  return {
    error: mutation.error,
    isPending: mutation.isPending,
    register: mutation.mutateAsync,
    result: mutation.data ?? null,
  };
}
