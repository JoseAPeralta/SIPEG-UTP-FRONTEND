import { useMemo } from "react";

import { useActivityCatalog } from "@/features/activity-catalog";
import { useOperations } from "@/features/operations";

export function useUsersOverview() {
  const { catalog, error: catalogError, isLoading: isCatalogLoading } = useActivityCatalog();
  const { error: operationsError, isLoading: isOperationsLoading, operations } = useOperations();

  const rows = useMemo(() => {
    if (!operations) {
      return [];
    }

    const careerById = new Map(operations.careers.map((career) => [career.id, career]));
    const unitById = new Map((catalog?.organizationalUnits ?? []).map((unit) => [unit.id, unit]));

    return operations.users.map((user) => ({
      careerName: user.careerId ? (careerById.get(user.careerId)?.name ?? null) : null,
      unitLabel: user.unitId
        ? (unitById.get(user.unitId)?.code ?? unitById.get(user.unitId)?.name ?? null)
        : null,
      user,
    }));
  }, [catalog, operations]);

  return {
    error: catalogError ?? operationsError,
    isLoading: isCatalogLoading || isOperationsLoading,
    rows,
  };
}
