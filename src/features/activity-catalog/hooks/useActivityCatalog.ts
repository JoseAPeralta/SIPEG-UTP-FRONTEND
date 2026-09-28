import { useQuery } from "@tanstack/react-query";

import { useAppAdapters } from "@/app/adapters";
import type { ActivityCatalogAccess } from "@/app/adapters";
import { queryKeys } from "@/app/query";
import { useSessionStore } from "@/store/session";

export function useActivityCatalog(access: ActivityCatalogAccess) {
  const { activityCatalog } = useAppAdapters();
  const userId = useSessionStore((state) => state.currentUser?.id);
  const canLoad = access === "public" || userId !== undefined;
  const { data, error, isLoading, refetch } = useQuery({
    enabled: canLoad,
    queryFn: () => activityCatalog.loadCatalog(access),
    queryKey:
      access === "public"
        ? queryKeys.publicActivityCatalog
        : queryKeys.administrativeActivityCatalog(userId ?? "anonymous"),
  });

  return {
    catalog: data ?? null,
    error,
    isLoading,
    refetch: canLoad ? refetch : () => Promise.resolve(undefined),
  };
}
