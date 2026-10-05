import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useAppAdapters } from "@/app/adapters";
import { queryKeys } from "@/app/query";
import { useSessionStore } from "@/store/session";

import { toClassroomFailure, type ClassroomFailure } from "../adapters/classroomFailure";
import type { ClassroomDetail } from "../model/classroomDetail";
import type {
  AddClassroomAvailabilityRequest,
  CreateClassroomRequest,
  UpdateClassroomRequest,
} from "../model/classroomRequests";

const UNAVAILABLE = "La administración de aulas no está disponible.";
const ANONYMOUS_USER = "anonymous";

type QueryClientLike = ReturnType<typeof useQueryClient>;

/**
 * Matriz de invalidacion por tipo de cambio.
 *
 * Un cambio de aula se refleja en varias vistas: los listados publico y administrativo, el detalle
 * exacto del aula y la consulta autoritativa de disponibilidad. La agenda publica embebe solo
 * `name` y `building`, de modo que solo esos campos justifican reconsultarla. El catalogo
 * administrativo de actividades recompone los nombres de aula desde este listado, asi que no se
 * invalida por separado. La disponibilidad cambia cuando cambia la ventana, la capacidad, la
 * amenidad o el estado. Las claves administrativas se ligan a la identidad y nunca al token.
 */
function invalidateClassroomLists(queryClient: QueryClientLike, userId: string) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.publicClassrooms }),
    queryClient.invalidateQueries({ queryKey: queryKeys.administrativeClassroomsScope(userId) }),
  ]);
}

function invalidateAvailability(queryClient: QueryClientLike) {
  return queryClient.invalidateQueries({ queryKey: queryKeys.availableClassroomsRoot });
}

function invalidateClassroomDetail(
  queryClient: QueryClientLike,
  userId: string,
  classroomId: string,
) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.publicClassroomDetail(classroomId) }),
    queryClient.invalidateQueries({
      queryKey: queryKeys.administrativeClassroomDetail(userId, classroomId),
    }),
  ]);
}

function invalidatePublicAgenda(queryClient: QueryClientLike) {
  return queryClient.invalidateQueries({ queryKey: queryKeys.publicActivityCatalog });
}

type UpdateVariables = { classroomId: string; request: UpdateClassroomRequest };

export function useClassroomMutations() {
  const { classrooms } = useAppAdapters();
  const queryClient = useQueryClient();
  const userId = useSessionStore((state) => state.currentUser?.id) ?? ANONYMOUS_USER;

  /**
   * `mutateAsync` recibe un unico objeto de variables: el segundo argumento lo interpreta
   * TanStack como opciones de la mutacion. Por eso cada comando declara sus variables como un
   * objeto y se adapta aqui al puerto, en vez de exponer firmas variadicas que nunca llegarian al
   * adapter. El comando se resuelve al enviar y no en el render, para que un puerto sin comandos
   * falle con un mensaje de producto en lugar de `undefined is not a function`.
   */
  function useCommand<TVariables>(
    resolve: () => ((variables: TVariables) => Promise<ClassroomDetail>) | undefined,
    onSuccess: (variables: TVariables) => Promise<unknown>,
  ) {
    return useMutation({
      mutationFn: (variables: TVariables) => {
        const command = resolve();
        if (!command) throw new Error(UNAVAILABLE);
        return command(variables);
      },
      onSuccess: (_data, variables) => onSuccess(variables).then(() => undefined),
    });
  }

  const create = useCommand<CreateClassroomRequest>(
    () => classrooms.createClassroom && ((request) => classrooms.createClassroom!(request)),
    () =>
      Promise.all([
        invalidateClassroomLists(queryClient, userId),
        invalidateAvailability(queryClient),
      ]),
  );
  const update = useCommand<UpdateVariables>(
    () =>
      classrooms.updateClassroom &&
      (({ classroomId, request }) => classrooms.updateClassroom!(classroomId, request)),
    ({ classroomId, request }) => {
      const invalidations: Promise<unknown>[] = [
        invalidateClassroomLists(queryClient, userId),
        invalidateAvailability(queryClient),
        invalidateClassroomDetail(queryClient, userId, classroomId),
      ];

      if (request.name !== undefined || request.building !== undefined) {
        invalidations.push(invalidatePublicAgenda(queryClient));
      }

      return Promise.all(invalidations);
    },
  );
  const addAmenity = useCommand<{ amenity: string; classroomId: string }>(
    () =>
      classrooms.addClassroomAmenity &&
      (({ amenity, classroomId }) => classrooms.addClassroomAmenity!(classroomId, amenity)),
    ({ classroomId }) =>
      Promise.all([
        invalidateClassroomLists(queryClient, userId),
        invalidateAvailability(queryClient),
        invalidateClassroomDetail(queryClient, userId, classroomId),
      ]),
  );
  const removeAmenity = useCommand<{ amenity: string; classroomId: string }>(
    () =>
      classrooms.removeClassroomAmenity &&
      (({ amenity, classroomId }) => classrooms.removeClassroomAmenity!(classroomId, amenity)),
    ({ classroomId }) =>
      Promise.all([
        invalidateClassroomLists(queryClient, userId),
        invalidateAvailability(queryClient),
        invalidateClassroomDetail(queryClient, userId, classroomId),
      ]),
  );
  const addAvailability = useCommand<{
    classroomId: string;
    request: AddClassroomAvailabilityRequest;
  }>(
    () =>
      classrooms.addClassroomAvailability &&
      (({ classroomId, request }) => classrooms.addClassroomAvailability!(classroomId, request)),
    ({ classroomId }) =>
      Promise.all([
        invalidateAvailability(queryClient),
        invalidateClassroomDetail(queryClient, userId, classroomId),
      ]),
  );
  const removeAvailability = useCommand<{ availabilityId: string; classroomId: string }>(
    () =>
      classrooms.removeClassroomAvailability &&
      (({ availabilityId, classroomId }) =>
        classrooms.removeClassroomAvailability!(classroomId, availabilityId)),
    ({ classroomId }) =>
      Promise.all([
        invalidateAvailability(queryClient),
        invalidateClassroomDetail(queryClient, userId, classroomId),
      ]),
  );

  const error =
    create.error ??
    update.error ??
    addAmenity.error ??
    removeAmenity.error ??
    addAvailability.error ??
    removeAvailability.error ??
    null;

  /**
   * El fallo se expone por area y no como un unico error, porque cada `409` significa algo distinto
   * segun el comando que lo produjo: un aula reservada, una amenidad repetida o un solape. Sin
   * esa separacion, la misma explicacion apareceria en las tres secciones a la vez.
   */
  const firstFailure = (errors: (Error | null | undefined)[]): ClassroomFailure | null => {
    const first = errors.find(Boolean);
    return first ? toClassroomFailure(first) : null;
  };

  return {
    addAmenity: (classroomId: string, amenity: string) =>
      addAmenity.mutateAsync({ amenity, classroomId }),
    addAvailability: (classroomId: string, request: AddClassroomAvailabilityRequest) =>
      addAvailability.mutateAsync({ classroomId, request }),
    amenityFailure: firstFailure([addAmenity.error, removeAmenity.error]),
    availabilityFailure: firstFailure([addAvailability.error, removeAvailability.error]),
    classroomFailure: firstFailure([create.error, update.error]),
    create: create.mutateAsync,
    error,
    failure: error ? toClassroomFailure(error) : null,
    isPending: [
      create.isPending,
      update.isPending,
      addAmenity.isPending,
      removeAmenity.isPending,
      addAvailability.isPending,
      removeAvailability.isPending,
    ].some(Boolean),
    removeAmenity: (classroomId: string, amenity: string) =>
      removeAmenity.mutateAsync({ amenity, classroomId }),
    removeAvailability: (classroomId: string, availabilityId: string) =>
      removeAvailability.mutateAsync({ availabilityId, classroomId }),
    update: (classroomId: string, request: UpdateClassroomRequest) =>
      update.mutateAsync({ classroomId, request }),
  };
}
