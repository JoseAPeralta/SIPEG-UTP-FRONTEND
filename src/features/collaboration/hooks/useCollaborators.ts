import { useQuery } from "@tanstack/react-query";
import { useAppAdapters } from "@/app/adapters/context";
import { queryKeys } from "@/app/query/keys";
import { useSessionStore } from "@/store/session";
import type { CollaborationScope } from "../model/ownPermissions";

export function useCollaborators(scope: CollaborationScope, enabled: boolean) {
  const { collaborators } = useAppAdapters();
  const userId = useSessionStore((state) => state.currentUser?.id);
  return useQuery({
    enabled: enabled && Boolean(userId),
    queryKey: queryKeys.collaborators(userId ?? "anonymous", scope),
    queryFn: () => collaborators.loadCollaborators(scope),
    staleTime: 0,
  });
}
