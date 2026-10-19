import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useAppAdapters } from "@/app/adapters";
import { queryKeys } from "@/app/query";
import { useSessionStore } from "@/store/session";

import { toEventProgramMutationFailure } from "../adapters/eventProgramFailure";
import type { CreateEventProgramRequest } from "../model/eventProgramRequests";

const ANONYMOUS_USER = "anonymous";

/**
 * Crea un programa adicional en borrador y refresca por prefijo todas las paginas y filtros del
 * listado administrativo. La clave administrativa esta ligada a la identidad y nunca se persiste.
 */
export function useCreateEventProgram() {
  const { eventPrograms } = useAppAdapters();
  const queryClient = useQueryClient();
  const currentUser = useSessionStore((state) => state.currentUser);
  const userId = currentUser?.id ?? ANONYMOUS_USER;
  const createEventProgram = eventPrograms.createEventProgram;

  const mutation = useMutation({
    mutationFn: (request: CreateEventProgramRequest) => {
      if (currentUser?.globalRole !== "ADMIN" || !createEventProgram) {
        throw new Error("La administración de programas no está disponible.");
      }

      return createEventProgram(request);
    },
    onSuccess: () =>
      queryClient
        .invalidateQueries({ queryKey: queryKeys.administrativeEventPrograms(userId) })
        .then(() => undefined),
  });

  return {
    create: mutation.mutateAsync,
    error: mutation.error,
    failure: mutation.error ? toEventProgramMutationFailure(mutation.error) : null,
    isPending: mutation.isPending,
    reset: mutation.reset,
  };
}
