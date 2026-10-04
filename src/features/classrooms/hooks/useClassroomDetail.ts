import { useQuery } from "@tanstack/react-query";

import { useAppAdapters, type ActivityCatalogAccess } from "@/app/adapters";
import { queryKeys } from "@/app/query";
import { useSessionStore } from "@/store/session";

import { toClassroomFailure } from "../adapters/classroomFailure";

/**
 * Detalle de un aula con su disponibilidad semanal.
 *
 * El contrato lo declara publico, pero la frontera sigue siendo doble: el panel necesita invalidar
 * la suya sin tocar la cache de la agenda, y la agenda publica no debe recibir nunca una escritura
 * administrativa. La clave administrativa se liga al `userId` y nunca al token.
 */
export function useClassroomDetail(classroomId: string, access: ActivityCatalogAccess = "public") {
  const { classrooms } = useAppAdapters();
  const userId = useSessionStore((state) => state.currentUser?.id);
  const canLoad = classroomId.length > 0 && (access === "public" || userId !== undefined);
  const getClassroom = classrooms.getClassroom;
  const query = useQuery({
    enabled: canLoad && getClassroom !== undefined,
    queryFn: () => getClassroom!(classroomId),
    queryKey:
      access === "public"
        ? queryKeys.publicClassroomDetail(classroomId)
        : queryKeys.administrativeClassroomDetail(userId ?? "anonymous", classroomId),
  });

  return {
    classroom: query.data ?? null,
    error: query.error,
    failure: query.error ? toClassroomFailure(query.error) : null,
    isLoading: query.isLoading,
    refetch: canLoad ? query.refetch : () => Promise.resolve(undefined),
  };
}
