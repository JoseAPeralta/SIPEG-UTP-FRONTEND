import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useAppAdapters } from "@/app/adapters";
import { queryKeys } from "@/app/query";

import { toActivityMutationFailure } from "../adapters/activityFailure";
import type { AdministrativeActivityDetail } from "../model/administrativeActivity";
import type {
  CancelActivityRequest,
  CreateActivityRequest,
  UpdateActivityRequest,
} from "../model/activityRequests";

import {
  invalidateActivityMutationReads,
  isActivityMutationIdentityCurrent,
  readActivityMutationIdentity,
  type ActivityMutationIdentity,
} from "./activityMutationReads";

type QueryClientLike = ReturnType<typeof useQueryClient>;

/**
 * Incorpora la respuesta autoritativa del comando y revalida las lecturas relacionadas de la
 * identidad que inicio la operacion.
 *
 * La lectura exacta en vuelo se cancela antes de escribir, para que una respuesta iniciada antes
 * del comando no sobrescriba el detalle devuelto por el servidor. Una respuesta de otra generacion
 * de sesion no repuebla la cache privada de la sesion activa, aunque la revalidacion publica y la
 * de la identidad iniciadora se conservan porque el estado del servidor si cambio.
 */
async function completeActivityMutation(
  queryClient: QueryClientLike,
  identity: ActivityMutationIdentity,
  detail: AdministrativeActivityDetail,
) {
  if (isActivityMutationIdentityCurrent(identity)) {
    const detailKey = queryKeys.activityAdministrationDetail(identity.userId, detail.id);

    await queryClient.cancelQueries({ exact: true, queryKey: detailKey });
    queryClient.setQueryData(detailKey, detail);
  }

  await invalidateActivityMutationReads(queryClient, identity, {
    activityId: detail.id,
    programId: detail.eventProgram.id,
  });
}

/**
 * Crea, edita, publica, despublica y cancela actividades. Un fallo no invalida nada: el formulario
 * conserva lo escrito y el reintento es inmediato.
 */
export function useActivityMutations() {
  const { activities } = useAppAdapters();
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (request: CreateActivityRequest) => activities.createActivity(request),
    onMutate: () => readActivityMutationIdentity(),
    onSuccess: (detail, _request, identity) =>
      completeActivityMutation(queryClient, identity, detail),
  });
  const updateMutation = useMutation({
    mutationFn: ({ activityId, request }: { activityId: string; request: UpdateActivityRequest }) =>
      activities.updateActivity(activityId, request),
    onMutate: () => readActivityMutationIdentity(),
    onSuccess: (detail, _variables, identity) =>
      completeActivityMutation(queryClient, identity, detail),
    retry: false,
  });
  const cancelMutation = useMutation({
    mutationFn: ({ activityId, request }: { activityId: string; request: CancelActivityRequest }) =>
      activities.cancelActivity(activityId, request),
    onMutate: () => readActivityMutationIdentity(),
    onSuccess: (detail, _variables, identity) =>
      completeActivityMutation(queryClient, identity, detail),
    retry: false,
  });

  const error = createMutation.error ?? updateMutation.error ?? cancelMutation.error ?? null;

  return {
    cancel: (activityId: string, request: CancelActivityRequest) =>
      cancelMutation.mutateAsync({ activityId, request }),
    create: createMutation.mutateAsync,
    error,
    failure: error ? toActivityMutationFailure(error) : null,
    isPending: createMutation.isPending || updateMutation.isPending || cancelMutation.isPending,
    publish: (activityId: string) =>
      updateMutation.mutateAsync({ activityId, request: { status: "SCHEDULED" } }),
    reset: () => {
      createMutation.reset();
      updateMutation.reset();
      cancelMutation.reset();
    },
    unpublish: (activityId: string) =>
      updateMutation.mutateAsync({ activityId, request: { status: "DRAFT" } }),
    update: (activityId: string, request: UpdateActivityRequest) =>
      updateMutation.mutateAsync({ activityId, request }),
  };
}
