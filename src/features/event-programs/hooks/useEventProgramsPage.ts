import { useQuery } from "@tanstack/react-query";

import { useAppAdapters } from "@/app/adapters";
import { queryKeys } from "@/app/query";
import { useSessionStore } from "@/store/session";
import type { EventProgramListFilters } from "../model/eventProgramList";

/**
 * Una pagina filtrada del listado administrativo de programas.
 *
 * La clave incluye identidad, filtros y pagina, de modo que cambiar cualquier entrada consulta de
 * nuevo en lugar de mostrar resultados ajenos. Solo el rol ADMIN habilita la consulta; el guard de la
 * ruta es la primera barrera y el backend conserva la autoridad final sobre los estados visibles.
 */
export function useEventProgramsPage(filters: EventProgramListFilters, page: number) {
  const { eventPrograms } = useAppAdapters();
  const currentUser = useSessionStore((state) => state.currentUser);
  const loadPage = eventPrograms.loadEventProgramsPage;
  const canLoad = currentUser?.globalRole === "ADMIN" && loadPage !== undefined;
  const query = useQuery({
    enabled: canLoad,
    queryFn: () => loadPage!(filters, page),
    queryKey: queryKeys.administrativeEventProgramsPage(
      currentUser?.id ?? "anonymous",
      filters,
      page,
    ),
  });

  return {
    error: query.error,
    isFetching: query.isFetching,
    isLoading: query.isLoading,
    page: query.data ?? null,
    refetch: canLoad ? query.refetch : () => Promise.resolve(undefined),
  };
}
