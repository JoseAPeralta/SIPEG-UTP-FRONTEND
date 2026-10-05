import { useQuery } from "@tanstack/react-query";

import { useAppAdapters } from "@/app/adapters";
import { queryKeys } from "@/app/query";
import { useSessionStore } from "@/store/session";

import type { AlertFilters } from "../model/alert";

const UNREAD_FILTERS: AlertFilters = { isRead: false };

/**
 * Conteo de alertas sin leer de la sesion.
 *
 * Se apoya en la primera pagina filtrada por `isRead=false` y proyecta `total`, porque contar
 * `items` subestimaria cualquier bandeja con mas de una pagina. La clave es la misma que usara la
 * bandeja de 7.3, se liga al `userId` y nunca se persiste. Sin sesion o durante la restauracion no
 * se consulta; al cambiar de identidad no hay dato previo que mostrar porque la clave cambia.
 */
export function useUnreadAlertsCount() {
  const { alerts } = useAppAdapters();
  const status = useSessionStore((state) => state.status);
  const userId = useSessionStore((state) => state.currentUser?.id);
  const canLoad = status === "authenticated" && userId !== undefined;

  const query = useQuery({
    enabled: canLoad,
    queryFn: () => alerts.loadAlertsPage(UNREAD_FILTERS, 1),
    queryKey: queryKeys.alertsPage(userId ?? "anonymous", UNREAD_FILTERS, 1),
    select: (page) => page.total,
  });

  return {
    count: canLoad ? (query.data ?? null) : null,
    error: query.error,
    isFetching: query.isFetching,
    isLoading: canLoad && query.isLoading,
  };
}
