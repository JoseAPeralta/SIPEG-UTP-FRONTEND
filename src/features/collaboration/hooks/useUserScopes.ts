import { useQuery } from "@tanstack/react-query";

import { useAppAdapters } from "@/app/adapters";
import { queryKeys } from "@/app/query";
import { useSessionStore } from "@/store/session";

import type { UserScopeFilters } from "../model/userScopes";

/**
 * Scopes accesibles de la sesion mediante una sola operacion paginada.
 *
 * La clave se liga a la identidad y nunca al token; el descubrimiento es privado y no se persiste.
 * La autorizacion efectiva sigue perteneciendo al backend: esta lista solo describe donde puede
 * trabajar el usuario para navegacion y contexto.
 */
export function useUserScopes(filters: UserScopeFilters = {}) {
  const { userScopes } = useAppAdapters();
  const userId = useSessionStore((state) => state.currentUser?.id);
  const canLoad = userId !== undefined;
  const query = useQuery({
    enabled: canLoad,
    queryFn: () => userScopes.loadUserScopes(filters),
    queryKey: queryKeys.userScopes(userId ?? "anonymous", filters),
  });

  return {
    error: query.error,
    isLoading: query.isLoading,
    refetch: canLoad ? query.refetch : () => Promise.resolve(undefined),
    scopes: query.data ?? null,
  };
}
