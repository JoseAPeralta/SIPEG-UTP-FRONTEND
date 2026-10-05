import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useAppAdapters } from "@/app/adapters";
import { queryKeys } from "@/app/query";
import { useSessionStore } from "@/store/session";

import { toOrganizationalUnitFailure } from "../adapters/organizationalUnitFailure";
import type {
  CreateOrganizationalUnitRequest,
  UpdateOrganizationalUnitRequest,
} from "../model/organizationalUnitRequests";

type QueryClientLike = ReturnType<typeof useQueryClient>;

const ANONYMOUS_USER = "anonymous";

/**
 * Un cambio de unidad alcanza a mas de un consumidor. Crear una unidad crea su programa
 * predeterminado y desactivarla lo archiva, de modo que ambos catalogos de actividades dependen de
 * esas transacciones. Editar el nombre altera la agenda publica, que embebe el nombre de la unidad,
 * pero no el catalogo administrativo, que recompone los nombres desde la lista de unidades. Las
 * claves administrativas se ligan a la identidad y nunca al token.
 */
function invalidateUnitLists(queryClient: QueryClientLike, userId: string) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.publicOrganizationalUnits }),
    queryClient.invalidateQueries({
      queryKey: queryKeys.administrativeOrganizationalUnits(userId),
    }),
  ]);
}

function invalidateActivityCatalogs(queryClient: QueryClientLike, userId: string) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.publicActivityCatalog }),
    queryClient.invalidateQueries({ queryKey: queryKeys.administrativeActivityCatalog(userId) }),
  ]);
}

function invalidateUnitDetail(queryClient: QueryClientLike, userId: string, unitId: string) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.publicOrganizationalUnitDetail(unitId) }),
    queryClient.invalidateQueries({
      queryKey: queryKeys.administrativeOrganizationalUnitDetail(userId, unitId),
    }),
  ]);
}

export function useOrganizationalUnitMutations() {
  const { organizationalUnits } = useAppAdapters();
  const queryClient = useQueryClient();
  const userId = useSessionStore((state) => state.currentUser?.id) ?? ANONYMOUS_USER;
  const createOrganizationalUnit = organizationalUnits.createOrganizationalUnit;
  const updateOrganizationalUnit = organizationalUnits.updateOrganizationalUnit;
  const deactivateOrganizationalUnit = organizationalUnits.deactivateOrganizationalUnit;
  const reactivateOrganizationalUnit = organizationalUnits.reactivateOrganizationalUnit;

  const createMutation = useMutation({
    mutationFn: (request: CreateOrganizationalUnitRequest) => {
      if (!createOrganizationalUnit)
        throw new Error("La administración de unidades no está disponible.");
      return createOrganizationalUnit(request);
    },
    onSuccess: () =>
      invalidateUnitLists(queryClient, userId)
        .then(() => invalidateActivityCatalogs(queryClient, userId))
        .then(() => undefined),
  });
  const updateMutation = useMutation({
    mutationFn: ({
      request,
      unitId,
    }: {
      request: UpdateOrganizationalUnitRequest;
      unitId: string;
    }) => {
      if (!updateOrganizationalUnit)
        throw new Error("La administración de unidades no está disponible.");
      return updateOrganizationalUnit(unitId, request);
    },
    onSuccess: (_detail, { request, unitId }) => {
      const invalidations: Promise<unknown>[] = [
        invalidateUnitLists(queryClient, userId),
        invalidateUnitDetail(queryClient, userId, unitId),
      ];

      if (request.name !== undefined) {
        invalidations.push(
          queryClient.invalidateQueries({ queryKey: queryKeys.publicActivityCatalog }),
        );
      }

      return Promise.all(invalidations).then(() => undefined);
    },
  });
  const deactivateMutation = useMutation({
    mutationFn: (unitId: string) => {
      if (!deactivateOrganizationalUnit)
        throw new Error("La administración de unidades no está disponible.");
      return deactivateOrganizationalUnit(unitId);
    },
    onSuccess: (_detail, unitId) =>
      Promise.all([
        invalidateUnitLists(queryClient, userId),
        invalidateUnitDetail(queryClient, userId, unitId),
        invalidateActivityCatalogs(queryClient, userId),
      ]).then(() => undefined),
  });
  const reactivateMutation = useMutation({
    mutationFn: (unitId: string) => {
      if (!reactivateOrganizationalUnit)
        throw new Error("La administración de unidades no está disponible.");
      return reactivateOrganizationalUnit(unitId);
    },
    onSuccess: (_detail, unitId) =>
      Promise.all([
        invalidateUnitLists(queryClient, userId),
        invalidateUnitDetail(queryClient, userId, unitId),
        invalidateActivityCatalogs(queryClient, userId),
      ]).then(() => undefined),
  });

  const error =
    createMutation.error ??
    updateMutation.error ??
    deactivateMutation.error ??
    reactivateMutation.error ??
    null;

  return {
    create: createMutation.mutateAsync,
    deactivate: deactivateMutation.mutateAsync,
    error,
    failure: error ? toOrganizationalUnitFailure(error) : null,
    isPending:
      createMutation.isPending ||
      updateMutation.isPending ||
      deactivateMutation.isPending ||
      reactivateMutation.isPending,
    reactivate: reactivateMutation.mutateAsync,
    reset: () => {
      createMutation.reset();
      updateMutation.reset();
      deactivateMutation.reset();
      reactivateMutation.reset();
    },
    update: (unitId: string, request: UpdateOrganizationalUnitRequest) =>
      updateMutation.mutateAsync({ request, unitId }),
  };
}
