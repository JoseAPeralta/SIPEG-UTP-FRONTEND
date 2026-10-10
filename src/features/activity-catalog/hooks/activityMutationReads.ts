import type { QueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/app/query";
import { useSessionStore } from "@/store/session";

const ANONYMOUS_USER = "anonymous";

type QueryClientLike = Pick<QueryClient, "invalidateQueries">;

/**
 * Identidad que inicio el comando.
 *
 * La generacion distingue una sesion nueva de la misma cuenta despues de un cierre o un reemplazo,
 * de modo que una respuesta tardia no escribe datos privados en la sesion activa.
 */
export type ActivityMutationIdentity = {
  sessionGeneration: number;
  userId: string;
};

export type ActivityMutationReadTarget = {
  activityId: string;
  programId: string;
};

export function readActivityMutationIdentity(): ActivityMutationIdentity {
  const { currentUser, sessionGeneration } = useSessionStore.getState();

  return { sessionGeneration, userId: currentUser?.id ?? ANONYMOUS_USER };
}

export function isActivityMutationIdentityCurrent(identity: ActivityMutationIdentity): boolean {
  const { currentUser, sessionGeneration } = useSessionStore.getState();

  return (
    (currentUser?.id ?? ANONYMOUS_USER) === identity.userId &&
    sessionGeneration === identity.sessionGeneration
  );
}

/**
 * Matriz comun de revalidacion de una actividad.
 *
 * La vista del programa propietario se invalida por su prefijo —no la identidad completa— porque
 * solo ese programa cambio; el catalogo administrativo cubre sus dos modalidades y con ellas el
 * dashboard y las opciones del contexto de trabajo. La agenda y el detalle publicos y el
 * descubrimiento de scopes completan las lecturas afectadas. Las claves privadas se ligan a la
 * identidad que inicio la operacion y nunca al token.
 */
function invalidateActivityReads(
  queryClient: QueryClientLike,
  identity: ActivityMutationIdentity,
  target: ActivityMutationReadTarget,
): Promise<unknown>[] {
  return [
    queryClient.invalidateQueries({
      queryKey: queryKeys.activityAdministrationProgramScope(identity.userId, target.programId),
    }),
    queryClient.invalidateQueries({
      queryKey: queryKeys.administrativeActivityCatalog(identity.userId),
    }),
    queryClient.invalidateQueries({ queryKey: queryKeys.publicActivityCatalog }),
    queryClient.invalidateQueries({ queryKey: queryKeys.publicActivityDetail(target.activityId) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.userScopesScope(identity.userId) }),
  ];
}

/**
 * Reconciliacion de alta, edicion y ciclo de vida.
 *
 * La disponibilidad de aulas se revalida porque publicar, despublicar o cancelar una actividad
 * cambia su reserva, y una edicion puede mover el aula o el horario.
 */
export function invalidateActivityMutationReads(
  queryClient: QueryClientLike,
  identity: ActivityMutationIdentity,
  target: ActivityMutationReadTarget,
): Promise<void> {
  return Promise.all([
    ...invalidateActivityReads(queryClient, identity, target),
    queryClient.invalidateQueries({ queryKey: queryKeys.availableClassroomsRoot }),
  ]).then(() => undefined);
}

/**
 * Reconciliacion de la eliminacion de un borrador.
 *
 * No revalida la disponibilidad de aulas: el contrato solo permite eliminar `DRAFT` y un borrador
 * nunca reserva un aula, de modo que marcar esa lectura como obsoleta afirmaria una relectura que
 * no cambio.
 */
export function invalidateActivityDeletionReads(
  queryClient: QueryClientLike,
  identity: ActivityMutationIdentity,
  target: ActivityMutationReadTarget,
): Promise<void> {
  return Promise.all(invalidateActivityReads(queryClient, identity, target)).then(() => undefined);
}
