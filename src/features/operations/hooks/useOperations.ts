import { useQuery } from "@tanstack/react-query";

import { useAppAdapters } from "@/app/adapters";
import { queryKeys } from "@/app/query";

export function useOperations() {
  const { operations } = useAppAdapters();
  const { data, error, isPending, refetch } = useQuery({
    queryFn: () => operations.loadOperations(),
    queryKey: queryKeys.operations,
  });

  return { error, isLoading: isPending, operations: data ?? null, refetch };
}
