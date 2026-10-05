import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useAppAdapters } from "@/app/adapters";
import { queryKeys } from "@/app/query";
import { useSessionStore } from "@/store/session";

import { toCareerMutationFailure } from "../adapters/careerMutationFailure";
import type { CreateCareerRequest, UpdateCareerRequest } from "../model/careerRequests";

type QueryClientLike = ReturnType<typeof useQueryClient>;

const ANONYMOUS_USER = "anonymous";

/**
 * Una carrera vive tambien dentro del detalle de su unidad (`OrganizationalUnitDetail.careers`), de
 * modo que crear, editar o eliminar una carrera invalida tanto los listados de carrera como los
 * detalles de unidad. El registro y el perfil consumen la lista publica de carreras, y el panel
 * administrativo su lista por identidad.
 */
function invalidateCareerLists(queryClient: QueryClientLike, userId: string) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.publicCareers }),
    queryClient.invalidateQueries({ queryKey: queryKeys.administrativeCareers(userId) }),
  ]);
}

function invalidateOrganizationalUnitDetails(queryClient: QueryClientLike, userId: string) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.publicOrganizationalUnitDetails }),
    queryClient.invalidateQueries({
      queryKey: queryKeys.administrativeOrganizationalUnitDetails(userId),
    }),
  ]);
}

export function useCareerMutations() {
  const { careers } = useAppAdapters();
  const queryClient = useQueryClient();
  const userId = useSessionStore((state) => state.currentUser?.id) ?? ANONYMOUS_USER;
  const createCareer = careers.createCareer;
  const updateCareer = careers.updateCareer;
  const deleteCareer = careers.deleteCareer;

  const onSuccess = () =>
    invalidateCareerLists(queryClient, userId)
      .then(() => invalidateOrganizationalUnitDetails(queryClient, userId))
      .then(() => undefined);

  const createMutation = useMutation({
    mutationFn: (request: CreateCareerRequest) => {
      if (!createCareer) throw new Error("La administración de carreras no está disponible.");
      return createCareer(request);
    },
    onSuccess,
  });
  const updateMutation = useMutation({
    mutationFn: ({ careerId, request }: { careerId: string; request: UpdateCareerRequest }) => {
      if (!updateCareer) throw new Error("La administración de carreras no está disponible.");
      return updateCareer(careerId, request);
    },
    onSuccess,
  });
  const deleteMutation = useMutation({
    mutationFn: (careerId: string) => {
      if (!deleteCareer) throw new Error("La administración de carreras no está disponible.");
      return deleteCareer(careerId);
    },
    onSuccess,
  });

  const error = createMutation.error ?? updateMutation.error ?? deleteMutation.error ?? null;

  return {
    create: createMutation.mutateAsync,
    delete: deleteMutation.mutateAsync,
    error,
    failure: error ? toCareerMutationFailure(error) : null,
    isPending: createMutation.isPending || updateMutation.isPending || deleteMutation.isPending,
    update: (careerId: string, request: UpdateCareerRequest) =>
      updateMutation.mutateAsync({ careerId, request }),
  };
}
