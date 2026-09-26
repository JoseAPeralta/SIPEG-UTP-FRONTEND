import { useQuery } from "@tanstack/react-query";

import { useAppAdapters } from "@/app/adapters";
import { queryKeys } from "@/app/query";

export type ActivityCatalogAccess = "administrative" | "public";

export function useActivityCatalog(access: ActivityCatalogAccess) {
  const { activityCatalog } = useAppAdapters();
  const { data, error, isPending, refetch } = useQuery({
    queryFn: () => activityCatalog.loadCatalog(),
    queryKey:
      access === "public"
        ? queryKeys.publicActivityCatalog
        : queryKeys.administrativeActivityCatalog,
  });

  return { catalog: data ?? null, error, isLoading: isPending, refetch };
}
