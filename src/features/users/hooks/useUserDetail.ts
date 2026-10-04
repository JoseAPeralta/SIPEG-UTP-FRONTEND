import { useQuery } from "@tanstack/react-query";

import { useAppAdapters } from "@/app/adapters";
import { queryKeys } from "@/app/query";
import { useSessionStore } from "@/store/session";

import { toUserMutationFailure } from "../adapters/userMutationFailure";

/**
 * Detalle administrativo de una cuenta.
 *
 * La clave se liga a la identidad y al objetivo; el `404` se traduce a un fallo que la vista
 * convierte en un estado vacio con salida, no en un error reintentable.
 */
export function useUserDetail(targetUserId: string) {
  const { users } = useAppAdapters();
  const userId = useSessionStore((state) => state.currentUser?.id);
  const getUser = users.getUser;
  const canLoad = targetUserId.length > 0 && userId !== undefined && getUser !== undefined;
  const query = useQuery({
    enabled: canLoad,
    queryFn: () => getUser!(targetUserId),
    queryKey: queryKeys.administrativeUserDetail(userId ?? "anonymous", targetUserId),
  });

  return {
    error: query.error,
    failure: query.error ? toUserMutationFailure(query.error) : null,
    isLoading: query.isLoading,
    refetch: canLoad ? query.refetch : () => Promise.resolve(undefined),
    user: query.data ?? null,
  };
}
