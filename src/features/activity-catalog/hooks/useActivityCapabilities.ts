import { hasScopeCapability, useAuthorizationTime, useUserScopes } from "@/features/collaboration";
import { useSessionStore } from "@/store/session";

import type { ActivityAccessMode } from "../model/activityAccess";
import type { ActivityCapabilities } from "../model/activityCapabilities";

export type UseActivityCapabilitiesOptions = {
  /** La actividad editada; sin ella la edicion se resuelve por el scope del programa. */
  activityId?: string | undefined;
  mode: ActivityAccessMode;
  programId: string;
};

/**
 * Capacidades efectivas de la sesion para administrar actividades.
 *
 * `ADMIN` conserva todas las capacidades y el backend sigue siendo la autoridad final. Un
 * colaborador las obtiene del descubrimiento de scopes: crear exige `activity:create` sobre el
 * programa, y leer, editar, cancelar o eliminar se heredan del programa o del scope de la propia
 * actividad. Las ventanas vencidas no habilitan nada y vencen solas mientras la vista sigue abierta,
 * porque el reloj se reactiva en la frontera del permiso y no en una respuesta de red. `canDelete`
 * es independiente de editar y cancelar, y la vista decide ademas por estado de actividad y programa
 * con `canOfferActivityDeletion`.
 */
export function useActivityCapabilities({
  activityId,
  mode,
  programId,
}: UseActivityCapabilitiesOptions): ActivityCapabilities {
  const currentUser = useSessionStore((state) => state.currentUser);
  const isAdministrator = mode === "administration" && currentUser?.globalRole === "ADMIN";
  const scopesQuery = useUserScopes({}, !isAdministrator && currentUser !== null);
  const scopes = scopesQuery.scopes ?? [];
  const programScope = { id: programId, type: "program" } as const;
  const activityScope = activityId ? ({ id: activityId, type: "activity" } as const) : null;
  const now = useAuthorizationTime(
    isAdministrator
      ? []
      : scopes
          .filter(
            (scope) =>
              (scope.type === programScope.type && scope.id === programScope.id) ||
              (activityScope !== null &&
                scope.type === activityScope.type &&
                scope.id === activityScope.id),
          )
          .flatMap((scope) => scope.permissions),
  );

  if (isAdministrator) {
    return {
      canCancel: true,
      canCreate: true,
      canDelete: true,
      canEdit: true,
      canRead: true,
      isResolving: false,
    };
  }

  const heldOnScopes = (name: Parameters<typeof hasScopeCapability>[2]) =>
    hasScopeCapability(scopes, programScope, name, now) ||
    (activityScope !== null && hasScopeCapability(scopes, activityScope, name, now));

  return {
    canCancel: heldOnScopes("activity:cancel"),
    canCreate: hasScopeCapability(scopes, programScope, "activity:create", now),
    canDelete: heldOnScopes("activity:delete"),
    canEdit: heldOnScopes("activity:update"),
    canRead: heldOnScopes("activity:read"),
    isResolving: scopesQuery.isLoading,
  };
}
