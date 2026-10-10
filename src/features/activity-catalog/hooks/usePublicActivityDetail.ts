import { useQuery } from "@tanstack/react-query";

import { useAppAdapters } from "@/app/adapters/context";
import { PUBLIC_CATALOG_STALE_TIME_MS, queryKeys } from "@/app/query/publicCatalog";

/**
 * Detalle publico de una actividad.
 *
 * Comparte la politica de la agenda porque es la misma lectura anonima: sin
 * revalidacion al recuperar el foco y con la misma vigencia. La clave se separa
 * por id y no se persiste: una actividad puede cancelarse y el detalle no es
 * referencia offline. Sin `placeholderData`, cambiar de id nunca muestra el
 * detalle anterior.
 */
export function usePublicActivityDetail(activityId: string) {
  const { publicActivityCatalog } = useAppAdapters();
  const hasActivityId = activityId.trim().length > 0;

  const { data, error, isLoading, refetch } = useQuery({
    enabled: hasActivityId,
    queryFn: () => publicActivityCatalog.getPublicActivity(activityId),
    queryKey: queryKeys.publicActivityDetail(activityId),
    refetchOnWindowFocus: false,
    staleTime: PUBLIC_CATALOG_STALE_TIME_MS,
  });

  const activity = data ?? null;

  return {
    activity,
    error,
    isLoading,
    notFound: !isLoading && !error && activity === null,
    refetch,
  };
}
