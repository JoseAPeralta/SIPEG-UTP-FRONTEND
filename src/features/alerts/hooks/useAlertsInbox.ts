import { useOperationalAccess } from "@/features/collaboration/navigation";

import type { AlertFilters } from "../model/alert";
import { resolveAlertDestination, type AlertDestination } from "../model/alertNavigation";

import { useAlertReadMutations } from "./useAlertReadMutations";
import { useAlertsPage } from "./useAlertsPage";

/**
 * Bandeja privada con los destinos que la sesion puede abrir y las acciones de lectura.
 *
 * El descubrimiento operativo es independiente del listado: si falla o aun carga, las alertas se
 * conservan visibles y solo se omiten los enlaces, porque un fallo de permisos no prueba que no haya
 * alertas. Marcar como leida tampoco depende del descubrimiento: el backend ya autoriza por token.
 */
export function useAlertsInbox(filters: AlertFilters, page: number) {
  const listing = useAlertsPage(filters, page);
  const access = useOperationalAccess();
  const read = useAlertReadMutations();

  const destinations = new Map<string, AlertDestination>();
  for (const alert of listing.page?.items ?? []) {
    const destination = resolveAlertDestination(alert.target, access.scopes);
    if (destination) destinations.set(alert.id, destination);
  }

  return {
    accessError: access.error,
    accessIsLoading: access.isLoading,
    destinations,
    error: listing.error,
    isFetching: listing.isFetching,
    isLoading: listing.isLoading,
    isUpdating: read.isPending,
    markAllRead: read.markAllRead,
    markRead: read.markRead,
    page: listing.page,
    readError: read.error,
    refetch: listing.refetch,
    refetchAccess: access.refetch,
  };
}
