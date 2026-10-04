import { useQuery } from "@tanstack/react-query";

import { useAppAdapters } from "@/app/adapters";
import { queryKeys } from "@/app/query";
import { useSessionStore } from "@/store/session";

export function useUsers() {
  const { users } = useAppAdapters();
  const userId = useSessionStore((state) => state.currentUser?.id);
  const canLoad = userId !== undefined;
  const query = useQuery({
    enabled: canLoad,
    queryFn: () => users.loadUsers(),
    queryKey: queryKeys.administrativeUsers(userId ?? "anonymous"),
  });

  return {
    error: query.error,
    isLoading: query.isLoading,
    refetch: canLoad ? query.refetch : () => Promise.resolve(undefined),
    users: query.data ?? null,
  };
}
