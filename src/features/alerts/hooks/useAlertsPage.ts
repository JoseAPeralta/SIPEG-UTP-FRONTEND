import { useQuery } from "@tanstack/react-query";

import { useAppAdapters } from "@/app/adapters";
import { queryKeys } from "@/app/query";
import { useSessionStore } from "@/store/session";

import type { AlertFilters } from "../model/alert";

/**
 * Una pagina de la bandeja privada de la sesion.
 *
 * La clave se liga al `userId` y nunca al token; las alertas no se persisten. `placeholderData`
 * conserva la pagina anterior mientras llega la nueva, de modo que cambiar de pagina o filtro no
 * vacia la bandeja.
 */
export function useAlertsPage(filters: AlertFilters, page: number) {
  const { alerts } = useAppAdapters();
  const userId = useSessionStore((state) => state.currentUser?.id);
  const canLoad = userId !== undefined;
  const query = useQuery({
    enabled: canLoad,
    // Solo se conserva la pagina anterior cuando pertenece a la misma cuenta. La clave es
    // ["alerts", userId, filters, page], de modo que el indice 1 identifica al propietario.
    placeholderData: (previousData, previousQuery) =>
      previousQuery?.queryKey[1] === userId ? previousData : undefined,
    queryFn: () => alerts.loadAlertsPage(filters, page),
    queryKey: queryKeys.alertsPage(userId ?? "anonymous", filters, page),
  });

  return {
    error: query.error,
    isFetching: query.isFetching,
    isLoading: query.isLoading,
    page: query.data ?? null,
    refetch: canLoad ? query.refetch : () => Promise.resolve(undefined),
  };
}
