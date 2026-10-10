import { useQuery } from "@tanstack/react-query";

import { useAppAdapters } from "@/app/adapters/context";
import { queryKeys } from "@/app/query/keys";
import { useSessionStore } from "@/store/session";

import type { ActivityListFilters } from "../model/administrativeActivity";

/**
 * Una pagina filtrada de actividades de un programa.
 *
 * La clave incluye identidad, programa, filtros y pagina, de modo que cambiar cualquier entrada
 * consulta de nuevo en lugar de mostrar resultados ajenos. La autorizacion final pertenece al
 * backend: `enabled` solo evita peticiones cuando la vista sabe que no hay acceso.
 */
export function useProgramActivitiesPage(
  programId: string,
  filters: ActivityListFilters,
  page: number,
  enabled = true,
) {
  const { activities } = useAppAdapters();
  const userId = useSessionStore((state) => state.currentUser?.id);
  const canLoad = Boolean(userId && programId) && enabled;
  const query = useQuery({
    enabled: canLoad,
    queryFn: () => activities.loadProgramActivitiesPage(programId, filters, page),
    queryKey: queryKeys.activityAdministrationPage(userId ?? "anonymous", programId, filters, page),
  });

  return {
    error: query.error,
    isFetching: query.isFetching,
    isLoading: query.isLoading,
    page: query.data ?? null,
    refetch: canLoad ? query.refetch : () => Promise.resolve(undefined),
  };
}
