import { useMemo } from "react";

import { useActivityCatalog } from "@/features/activity-catalog";
import { useOperations } from "@/features/operations";

export function useSpeakersOverview() {
  const { catalog, error: catalogError, isLoading: isCatalogLoading } = useActivityCatalog();
  const { error: operationsError, isLoading: isOperationsLoading, operations } = useOperations();

  const rows = useMemo(() => {
    if (!operations) {
      return [];
    }

    const programById = new Map(
      (catalog?.eventPrograms ?? []).map((program) => [program.id, program]),
    );

    return operations.speakerProposals.map((proposal) => ({
      programName: programById.get(proposal.eventProgramId)?.name ?? null,
      proposal,
    }));
  }, [catalog, operations]);

  return {
    error: catalogError ?? operationsError,
    isLoading: isCatalogLoading || isOperationsLoading,
    rows,
  };
}
