import { useActivityCatalog } from "@/features/activity-catalog";

export function useClassroomsOverview() {
  const { catalog, error, isLoading, refetch } = useActivityCatalog("administrative");

  return { classrooms: catalog?.classrooms ?? [], error, isLoading, refetch };
}
