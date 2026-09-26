import { useActivityCatalog } from "@/features/activity-catalog";

export function useClassroomsOverview() {
  const { catalog, error, isLoading, refetch } = useActivityCatalog();

  return { classrooms: catalog?.classrooms ?? [], error, isLoading, refetch };
}
