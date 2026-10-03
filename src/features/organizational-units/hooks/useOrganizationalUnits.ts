import { useQuery } from "@tanstack/react-query";

import { useAppAdapters, type ActivityCatalogAccess } from "@/app/adapters";
import { queryKeys } from "@/app/query";
import { useSessionStore } from "@/store/session";

export function useOrganizationalUnits(access: ActivityCatalogAccess) {
  const { organizationalUnits } = useAppAdapters();
  const userId = useSessionStore((state) => state.currentUser?.id);
  const canLoad = access === "public" || userId !== undefined;
  const query = useQuery({
    enabled: canLoad,
    queryFn: () => organizationalUnits.loadOrganizationalUnits(),
    queryKey:
      access === "public"
        ? queryKeys.publicOrganizationalUnits
        : queryKeys.administrativeOrganizationalUnits(userId ?? "anonymous"),
  });

  return {
    error: query.error,
    isLoading: query.isLoading,
    organizationalUnits: query.data ?? null,
    refetch: canLoad ? query.refetch : () => Promise.resolve(undefined),
  };
}
