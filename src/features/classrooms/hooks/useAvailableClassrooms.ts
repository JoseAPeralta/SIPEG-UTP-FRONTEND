import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { useAppAdapters } from "@/app/adapters";
import { queryKeys } from "@/app/query";

import {
  areAvailableClassroomsCriteriaEqual,
  isAvailableClassroomsCriteriaValid,
  normalizeAvailableClassroomsCriteria,
  type AvailableClassroomsCriteria,
} from "../model/availableClassrooms";

export type AvailableClassroomsFailure = "invalidRequest" | "unknown";

function resolveFailure(error: Error | null): AvailableClassroomsFailure | null {
  if (error === null) return null;

  const status = "status" in error ? (error as { status?: unknown }).status : undefined;

  return status === 400 ? "invalidRequest" : "unknown";
}

/**
 * Keeps availability idle until the form explicitly requests it. Results are keyed by the submitted
 * snapshot rather than live form values, so editing a field never sends a request on its own.
 */
export function useAvailableClassrooms() {
  const { classrooms: classroomsAdapter } = useAppAdapters();
  const [criteria, setCriteria] = useState<AvailableClassroomsCriteria | null>(null);
  const query = useQuery({
    enabled: criteria !== null,
    queryFn: () => {
      const operation = classroomsAdapter.loadAvailableClassrooms;
      if (!operation || !criteria) {
        throw new Error("La consulta de disponibilidad no está disponible.");
      }

      return operation(criteria);
    },
    queryKey: queryKeys.availableClassrooms(criteria),
  });

  function search(nextCriteria: AvailableClassroomsCriteria) {
    const normalized = normalizeAvailableClassroomsCriteria(nextCriteria);
    if (!isAvailableClassroomsCriteriaValid(normalized)) return;

    if (areAvailableClassroomsCriteriaEqual(criteria, normalized)) {
      void query.refetch();
      return;
    }

    setCriteria(normalized);
  }

  return {
    classrooms: criteria ? (query.data ?? null) : null,
    criteria,
    failure: resolveFailure(query.error),
    isLoading: query.isFetching,
    queryKey: queryKeys.availableClassrooms(criteria),
    search,
  };
}
