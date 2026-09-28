import { useQuery } from "@tanstack/react-query";

import { useAppAdapters } from "@/app/adapters";
import { queryKeys } from "@/app/query";

export function useRegistrationCatalog() {
  const { registration } = useAppAdapters();
  const query = useQuery({
    queryFn: () => registration.loadCatalog(),
    queryKey: queryKeys.registrationCatalog,
  });

  return {
    catalog: query.data ?? null,
    error: query.error,
    isLoading: query.isPending,
    refetch: query.refetch,
  };
}
