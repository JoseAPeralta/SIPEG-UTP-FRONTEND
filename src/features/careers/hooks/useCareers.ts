import { useQuery } from "@tanstack/react-query";

import { useAppAdapters, type ActivityCatalogAccess } from "@/app/adapters";
import { queryKeys } from "@/app/query";
import { useSessionStore } from "@/store/session";

export function useCareers(access: ActivityCatalogAccess) {
  const { careers } = useAppAdapters();
  const userId = useSessionStore((state) => state.currentUser?.id);
  const canLoad = access === "public" || userId !== undefined;
  const query = useQuery({
    enabled: canLoad,
    queryFn: () => careers.loadCareers(),
    queryKey:
      access === "public"
        ? queryKeys.publicCareers
        : queryKeys.administrativeCareers(userId ?? "anonymous"),
  });

  return {
    careers: query.data ?? null,
    error: query.error,
    isLoading: query.isLoading,
    refetch: canLoad ? query.refetch : () => Promise.resolve(undefined),
  };
}
