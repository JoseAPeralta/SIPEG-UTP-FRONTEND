import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useAppAdapters } from "@/app/adapters";
import { queryKeys } from "@/app/query";
import { useSessionStore } from "@/store/session";

import { toEventProgramMutationFailure } from "../adapters/eventProgramFailure";
import type { EventProgramListItem } from "../model/eventProgramList";
import type { UpdateEventProgramRequest } from "../model/eventProgramRequests";

const ANONYMOUS_USER = "anonymous";

type QueryClientLike = ReturnType<typeof useQueryClient>;

/** Identificacion minima que la invalidacion necesita; una tarjeta del listado la satisface. */
export type EventProgramMutationTarget = Pick<
  EventProgramListItem,
  "id" | "isDefault" | "organizationalUnit"
>;

/**
 * Un cambio de programa alcanza al listado administrativo completo, al catalogo administrativo y a
 * la agenda publica. La agenda permanente ademas resume su nombre y estado en el detalle de la
 * unidad, que se refresca en sus dos fronteras. Las claves administrativas se ligan a la identidad
 * y nunca al token.
 */
function invalidateProgramReads(
  queryClient: QueryClientLike,
  userId: string,
  program: EventProgramMutationTarget,
) {
  const invalidations: Promise<unknown>[] = [
    queryClient.invalidateQueries({ queryKey: queryKeys.administrativeEventPrograms(userId) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.administrativeActivityCatalog(userId) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.publicActivityCatalog }),
  ];

  if (program.isDefault) {
    invalidations.push(
      queryClient.invalidateQueries({
        queryKey: queryKeys.administrativeOrganizationalUnitDetail(
          userId,
          program.organizationalUnit.id,
        ),
      }),
      queryClient.invalidateQueries({
        queryKey: queryKeys.publicOrganizationalUnitDetail(program.organizationalUnit.id),
      }),
    );
  }

  return Promise.all(invalidations).then(() => undefined);
}

/**
 * Edita, publica, archiva y reactiva programas desde el panel administrativo. Un fallo no invalida
 * nada: lo escrito en el formulario se conserva y el reintento es inmediato.
 */
export function useEventProgramMutations() {
  const { eventPrograms } = useAppAdapters();
  const queryClient = useQueryClient();
  const currentUser = useSessionStore((state) => state.currentUser);
  const userId = currentUser?.id ?? ANONYMOUS_USER;
  const { archiveEventProgram, reactivateEventProgram, updateEventProgram } = eventPrograms;

  function requireAdministration<T>(command: T | undefined): T {
    if (currentUser?.globalRole !== "ADMIN" || !command) {
      throw new Error("La administración de programas no está disponible.");
    }

    return command;
  }

  const updateMutation = useMutation({
    mutationFn: ({
      program,
      request,
    }: {
      program: EventProgramMutationTarget;
      request: UpdateEventProgramRequest;
    }) => requireAdministration(updateEventProgram)(program.id, request),
    onSuccess: (_program, { program }) => invalidateProgramReads(queryClient, userId, program),
  });
  const archiveMutation = useMutation({
    mutationFn: (program: EventProgramMutationTarget) =>
      requireAdministration(archiveEventProgram)(program.id),
    onSuccess: (_program, program) => invalidateProgramReads(queryClient, userId, program),
  });
  const reactivateMutation = useMutation({
    mutationFn: (program: EventProgramMutationTarget) =>
      requireAdministration(reactivateEventProgram)(program.id),
    onSuccess: (_program, program) => invalidateProgramReads(queryClient, userId, program),
  });

  const error = updateMutation.error ?? archiveMutation.error ?? reactivateMutation.error ?? null;

  return {
    archive: archiveMutation.mutateAsync,
    error,
    failure: error ? toEventProgramMutationFailure(error) : null,
    isPending:
      updateMutation.isPending || archiveMutation.isPending || reactivateMutation.isPending,
    /** Publicar es el unico parche de estado que el contrato acepta: `DRAFT -> ACTIVE`. */
    publish: (program: EventProgramMutationTarget) =>
      updateMutation.mutateAsync({ program, request: { status: "ACTIVE" } }),
    reactivate: reactivateMutation.mutateAsync,
    reset: () => {
      updateMutation.reset();
      archiveMutation.reset();
      reactivateMutation.reset();
    },
    /**
     * `mutateAsync` interpreta un segundo argumento como opciones de la mutacion, de modo que la
     * firma de dos parametros viaja dentro de un unico objeto.
     */
    update: (program: EventProgramMutationTarget, request: UpdateEventProgramRequest) =>
      updateMutation.mutateAsync({ program, request }),
  };
}
