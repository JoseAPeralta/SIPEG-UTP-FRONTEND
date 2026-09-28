import { useQuery } from "@tanstack/react-query";

import { useAppAdapters } from "@/app/adapters";
import { queryKeys } from "@/app/query";
import { useSessionStore } from "@/store/session";

export function useOperations() {
  const { operations } = useAppAdapters();
  const userId = useSessionStore((state) => state.currentUser?.id);
  const { data, error, isLoading, refetch } = useQuery({
    enabled: userId !== undefined,
    queryFn: () => operations.loadOperations(),
    queryKey: queryKeys.operations(userId ?? "anonymous"),
  });

  return {
    error,
    isLoading,
    operations: data ?? null,
    refetch: userId === undefined ? () => Promise.resolve(undefined) : refetch,
  };
}
