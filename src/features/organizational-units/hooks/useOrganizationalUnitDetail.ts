import { useQuery } from "@tanstack/react-query";

import { useAppAdapters, type ActivityCatalogAccess } from "@/app/adapters";
import { queryKeys } from "@/app/query";
import { useSessionStore } from "@/store/session";

import { toOrganizationalUnitFailure } from "../adapters/organizationalUnitFailure";

/**
 * Detalle de una unidad con sus carreras y su programa predeterminado.
 *
 * El `GET` es publico, pero la frontera sigue siendo doble: el panel invalida la suya sin tocar la
 * cache publica, y la agenda publica nunca recibe una escritura administrativa. La clave
 * administrativa se liga al `userId` y nunca al token.
 */
export function useOrganizationalUnitDetail(
  unitId: string,
  access: ActivityCatalogAccess = "public",
) {
  const { organizationalUnits } = useAppAdapters();
  const userId = useSessionStore((state) => state.currentUser?.id);
  const getOrganizationalUnit = organizationalUnits.getOrganizationalUnit;
  const canLoad =
    unitId.length > 0 &&
    (access === "public" || userId !== undefined) &&
    getOrganizationalUnit !== undefined;
  const query = useQuery({
    enabled: canLoad,
    queryFn: () => getOrganizationalUnit!(unitId),
    queryKey:
      access === "public"
        ? queryKeys.publicOrganizationalUnitDetail(unitId)
        : queryKeys.administrativeOrganizationalUnitDetail(userId ?? "anonymous", unitId),
  });

  return {
    error: query.error,
    failure: query.error ? toOrganizationalUnitFailure(query.error) : null,
    isLoading: query.isLoading,
    organizationalUnit: query.data ?? null,
    refetch: canLoad ? query.refetch : () => Promise.resolve(undefined),
  };
}
