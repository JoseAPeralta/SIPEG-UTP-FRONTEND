import { useQuery } from "@tanstack/react-query";
import { useAppAdapters } from "@/app/adapters/context";
import { queryKeys } from "@/app/query/keys";
import { useSessionStore } from "@/store/session";
import type { CollaborationScope } from "../model/ownPermissions";

/** Privada por identidad y scope; no se utiliza como catálogo de descubrimiento. */
export function useOwnPermissions(scope: CollaborationScope, enabled = true) {
  const { ownPermissions } = useAppAdapters();
  const userId = useSessionStore((state) => state.currentUser?.id);
  return useQuery({
    enabled: Boolean(userId) && enabled,
    queryKey: queryKeys.ownPermissions(userId ?? "anonymous", scope),
    queryFn: () => ownPermissions.loadOwnPermissions(scope),
    staleTime: 0,
    refetchInterval: 60_000,
  });
}
