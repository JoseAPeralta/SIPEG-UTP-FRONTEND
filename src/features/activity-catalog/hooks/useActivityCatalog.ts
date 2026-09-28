import { useQuery } from "@tanstack/react-query";

import { useAppAdapters } from "@/app/adapters";
import type { ActivityCatalogAccess } from "@/app/adapters";
import { queryKeys } from "@/app/query";

export function useActivityCatalog(access: ActivityCatalogAccess) {
  const { activityCatalog } = useAppAdapters();
  const { data, error, isLoading, refetch } = useQuery({
    queryFn: () => activityCatalog.loadCatalog(access),
    queryKey:
      access === "public"
        ? queryKeys.publicActivityCatalog
        : queryKeys.administrativeActivityCatalog,
  });

  return { catalog: data ?? null, error, isLoading, refetch };
}
