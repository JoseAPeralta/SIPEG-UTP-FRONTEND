import { useClassrooms } from "./useClassrooms";

export function useClassroomsOverview() {
  const { classrooms, error, isLoading, refetch } = useClassrooms("administrative");

  return { classrooms: classrooms ?? [], error, isLoading, refetch };
}
