import { useQuery } from "@tanstack/react-query";

import { useAppAdapters, type ActivityCatalogAccess } from "@/app/adapters";
import type { ClassroomFilters } from "@/app/adapters/contracts";
import { queryKeys } from "@/app/query";
import { useSessionStore } from "@/store/session";

/**
 * Listado de aulas.
 *
 * Los filtros son los del contrato y solo tienen efecto en la frontera administrativa: la agenda
 * publica necesita el catalogo completo y activo, sin filtros, porque es lo unico que consume.
 */
export function useClassrooms(access: ActivityCatalogAccess, filters: ClassroomFilters = {}) {
  const { classrooms } = useAppAdapters();
  const userId = useSessionStore((state) => state.currentUser?.id);
  const canLoad = access === "public" || userId !== undefined;
  const query = useQuery({
    enabled: canLoad,
    queryFn: () => classrooms.loadClassrooms(access === "public" ? undefined : filters),
    queryKey:
      access === "public"
        ? queryKeys.publicClassrooms
        : queryKeys.administrativeClassrooms(userId ?? "anonymous", filters),
  });

  return {
    classrooms: query.data ?? null,
    error: query.error,
    isLoading: query.isLoading,
    refetch: canLoad ? query.refetch : () => Promise.resolve(undefined),
  };
}
