import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { useAppAdapters } from "@/app/adapters";
import type { AdminUserFilters } from "@/app/adapters/contracts";
import { queryKeys } from "@/app/query";
import { useSessionStore } from "@/store/session";

/**
 * Una pagina del listado administrativo, ya filtrada por el backend.
 *
 * `placeholderData` conserva la pagina anterior mientras llega la nueva: cambiar de pagina o de
 * filtro no vacia la tabla ni vuelve a mostrar el estado de carga. La clave incluye filtros y pagina
 * para no mezclar resultados, y se liga al `userId`, nunca al token.
 */
export function useUsersPage(filters: AdminUserFilters, page: number) {
  const { users } = useAppAdapters();
  const userId = useSessionStore((state) => state.currentUser?.id);
  const loadUsersPage = users.loadUsersPage;
  const canLoad = userId !== undefined && loadUsersPage !== undefined;
  const query = useQuery({
    enabled: canLoad,
    placeholderData: keepPreviousData,
    queryFn: () => loadUsersPage!(filters, page),
    queryKey: queryKeys.administrativeUsersPage(userId ?? "anonymous", filters, page),
  });

  return {
    error: query.error,
    isFetching: query.isFetching,
    isLoading: query.isLoading,
    page: query.data ?? null,
    refetch: canLoad ? query.refetch : () => Promise.resolve(undefined),
  };
}
