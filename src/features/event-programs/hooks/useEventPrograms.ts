import { useQuery } from "@tanstack/react-query";
import { useAppAdapters } from "@/app/adapters/context";
import { queryKeys } from "@/app/query";
import { useSessionStore } from "@/store/session";

/** Lectura administrativa independiente; la sesión habilita la consulta, el backend autoriza. */
export function useEventPrograms() {
  const { eventPrograms } = useAppAdapters();
  const userId = useSessionStore((state) => state.currentUser?.id);
  const canLoad = userId !== undefined;
  const query = useQuery({
    enabled: canLoad,
    queryFn: () => eventPrograms.loadEventPrograms("administrative"),
    queryKey: queryKeys.administrativeEventPrograms(userId ?? "anonymous"),
  });

  return {
    error: query.error,
    eventPrograms: query.data ?? null,
    isLoading: query.isLoading,
    refetch: canLoad ? query.refetch : () => Promise.resolve(undefined),
  };
}
