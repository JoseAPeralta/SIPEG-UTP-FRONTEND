import { useMutation } from "@tanstack/react-query";

import { useAppAdapters } from "@/app/adapters";

export function useVerifyEmail() {
  const { auth } = useAppAdapters();
  const mutation = useMutation({
    mutationFn: (token: string) => auth.verifyEmail(token),
  });

  return {
    error: mutation.error,
    isPending: mutation.isPending,
    verify: mutation.mutateAsync,
  };
}
