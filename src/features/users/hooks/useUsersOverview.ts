import { useMemo } from "react";

import { useCareers } from "@/features/careers";
import { useOperations } from "@/features/operations";
import { useOrganizationalUnits } from "@/features/organizational-units";

export function useUsersOverview() {
  const careers = useCareers("administrative");
  const { error: operationsError, isLoading: isOperationsLoading, operations } = useOperations();
  const organizationalUnits = useOrganizationalUnits("administrative");

  const rows = useMemo(() => {
    if (!operations) {
      return [];
    }

    const careerById = new Map((careers.careers ?? []).map((career) => [career.id, career]));
    const unitById = new Map(
      (organizationalUnits.organizationalUnits ?? []).map((unit) => [unit.id, unit]),
    );

    return operations.users.map((user) => ({
      careerName: user.careerId ? (careerById.get(user.careerId)?.name ?? null) : null,
      unitLabel: user.unitId
        ? (unitById.get(user.unitId)?.code ?? unitById.get(user.unitId)?.name ?? null)
        : null,
      user,
    }));
  }, [careers.careers, operations, organizationalUnits.organizationalUnits]);

  return {
    error: careers.error ?? organizationalUnits.error ?? operationsError,
    isLoading: isOperationsLoading || careers.isLoading || organizationalUnits.isLoading,
    rows,
  };
}
