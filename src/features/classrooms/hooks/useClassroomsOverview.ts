import type { ClassroomFilters } from "@/app/adapters/contracts";

import { useClassrooms } from "./useClassrooms";

export function useClassroomsOverview(filters: ClassroomFilters = {}) {
  const { classrooms, error, isLoading, refetch } = useClassrooms("administrative", filters);

  return { classrooms: classrooms ?? [], error, isLoading, refetch };
}
