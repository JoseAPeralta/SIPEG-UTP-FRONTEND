import { useQuery } from "@tanstack/react-query";

import { useAppAdapters } from "@/app/adapters/context";
import { queryKeys } from "@/app/query/keys";
import { useSessionStore } from "@/store/session";

/**
 * Detalle administrativo de una actividad.
 *
 * La operacion viaja con Bearer y la clave se liga a la identidad; `enabled` permite posponer la
 * lectura hasta que la vista confirmo el acceso.
 */
export function useAdministrativeActivityDetail(activityId: string, enabled = true) {
  const { activities } = useAppAdapters();
  const userId = useSessionStore((state) => state.currentUser?.id);
  const canLoad = Boolean(userId && activityId) && enabled;
  const query = useQuery({
    enabled: canLoad,
    queryFn: () => activities.getActivity(activityId),
    queryKey: queryKeys.activityAdministrationDetail(userId ?? "anonymous", activityId),
  });

  return {
    activity: query.data ?? null,
    error: query.error,
    isFetching: query.isFetching,
    isLoading: query.isLoading,
    refetch: canLoad ? query.refetch : () => Promise.resolve(undefined),
  };
}
