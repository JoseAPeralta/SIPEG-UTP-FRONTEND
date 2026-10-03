import { useQuery } from "@tanstack/react-query";

import { useAppAdapters, type ActivityCatalogAccess } from "@/app/adapters";
import { queryKeys } from "@/app/query";
import { useSessionStore } from "@/store/session";

export function useClassrooms(access: ActivityCatalogAccess) {
  const { classrooms } = useAppAdapters();
  const userId = useSessionStore((state) => state.currentUser?.id);
  const canLoad = access === "public" || userId !== undefined;
  const query = useQuery({
    enabled: canLoad,
    queryFn: () => classrooms.loadClassrooms(),
    queryKey:
      access === "public"
        ? queryKeys.publicClassrooms
        : queryKeys.administrativeClassrooms(userId ?? "anonymous"),
  });

  return {
    classrooms: query.data ?? null,
    error: query.error,
    isLoading: query.isLoading,
    refetch: canLoad ? query.refetch : () => Promise.resolve(undefined),
  };
}
