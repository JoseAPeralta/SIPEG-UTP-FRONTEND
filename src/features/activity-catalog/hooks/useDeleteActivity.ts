import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useAppAdapters } from "@/app/adapters";
import { queryKeys } from "@/app/query";
import { useWorkingContextStore } from "@/store/workingContext";

import { toActivityMutationFailure } from "../adapters/activityFailure";

import {
  invalidateActivityDeletionReads,
  isActivityMutationIdentityCurrent,
  readActivityMutationIdentity,
} from "./activityMutationReads";

export type UseDeleteActivityOptions = {
  activityId: string;
  /** Se ejecuta una sola vez para abandonar el detalle tras confirmar el `204`. */
  onDeleted: () => void;
  /** Programa propietario; el llamador lo usa para elegir el destino tras la eliminacion. */
  programId: string;
};

/**
 * Elimina un borrador y reconcilia las lecturas afectadas.
 *
 * La entrada privada del detalle se cancela y se retira por clave exacta, porque la actividad deja
 * de existir; su disponibilidad no se revalida porque un borrador nunca ocupa un aula. La seleccion
 * de trabajo solo se limpia cuando apunta a la actividad eliminada, y la respuesta solo navega o
 * limpia el contexto si la identidad que inicio el comando sigue vigente, incluso despues de la
 * revalidacion. La revalidacion se espera sin convertir un fallo de lectura posterior en un rechazo
 * del `DELETE`.
 */
export function useDeleteActivity({ activityId, onDeleted, programId }: UseDeleteActivityOptions) {
  const { activities } = useAppAdapters();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => activities.deleteActivity(activityId),
    onMutate: () => readActivityMutationIdentity(),
    onSuccess: async (_result, _variables, identity) => {
      if (!isActivityMutationIdentityCurrent(identity)) return;

      const activityScope = { id: activityId, type: "activity" } as const;
      const detailKey = queryKeys.activityAdministrationDetail(identity.userId, activityId);

      await queryClient.cancelQueries({ exact: true, queryKey: detailKey });
      queryClient.removeQueries({ exact: true, queryKey: detailKey });
      queryClient.removeQueries({
        exact: true,
        queryKey: queryKeys.ownPermissions(identity.userId, activityScope),
      });
      queryClient.removeQueries({
        exact: true,
        queryKey: queryKeys.collaborators(identity.userId, activityScope),
      });

      try {
        await invalidateActivityDeletionReads(queryClient, identity, { activityId, programId });
      } catch {
        // El 204 ya confirmo la eliminacion; un fallo de lectura posterior no la desmiente.
      }

      if (!isActivityMutationIdentityCurrent(identity)) return;

      const { clearWorkingContext, workingContext } = useWorkingContextStore.getState();
      if (workingContext?.kind === "activity" && workingContext.id === activityId) {
        clearWorkingContext();
      }

      onDeleted();
    },
    retry: false,
  });

  return {
    failure: mutation.error ? toActivityMutationFailure(mutation.error) : null,
    isPending: mutation.isPending,
    remove: () => mutation.mutateAsync(),
    reset: mutation.reset,
  };
}
