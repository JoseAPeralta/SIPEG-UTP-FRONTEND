import { useQuery } from "@tanstack/react-query";

import { useAppAdapters } from "@/app/adapters";
import { queryKeys } from "@/app/query";

export function useActivityCatalog() {
  const { activityCatalog } = useAppAdapters();
  const { data, error, isPending, refetch } = useQuery({
    queryFn: () => activityCatalog.loadCatalog(),
    queryKey: queryKeys.activityCatalog,
  });

  return { catalog: data ?? null, error, isLoading: isPending, refetch };
}
