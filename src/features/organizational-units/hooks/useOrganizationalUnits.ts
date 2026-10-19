import { useQuery } from "@tanstack/react-query";

import { useAppAdapters, type ActivityCatalogAccess } from "@/app/adapters";
import type { OrganizationalUnitFilters } from "@/app/adapters/contracts";
import { queryKeys } from "@/app/query";
import { useSessionStore } from "@/store/session";

/**
 * Listado de unidades organizativas.
 *
 * Los filtros solo tienen efecto administrativo: la lectura publica siempre pide el catalogo
 * activo sin argumentos. La modalidad completa usa una clave propia para no mezclarse con el
 * listado por defecto.
 */
export function useOrganizationalUnits(
  access: ActivityCatalogAccess,
  filters: OrganizationalUnitFilters = {},
) {
  const { organizationalUnits } = useAppAdapters();
  const userId = useSessionStore((state) => state.currentUser?.id);
  const canLoad = access === "public" || userId !== undefined;
  const filtered =
    access === "administrative" && (filters.isActive === "all" || filters.isActive === "inactive");
  const query = useQuery({
    enabled: canLoad,
    queryFn: () =>
      filtered
        ? organizationalUnits.loadOrganizationalUnits(filters)
        : organizationalUnits.loadOrganizationalUnits(),
    queryKey:
      access === "public"
        ? queryKeys.publicOrganizationalUnits
        : filters.isActive === "all"
          ? queryKeys.administrativeOrganizationalUnitsAll(userId ?? "anonymous")
          : queryKeys.administrativeOrganizationalUnits(userId ?? "anonymous"),
  });

  return {
    error: query.error,
    isFetching: query.isFetching,
    isLoading: query.isLoading,
    organizationalUnits: query.data ?? null,
    refetch: canLoad ? query.refetch : () => Promise.resolve(undefined),
  };
}
