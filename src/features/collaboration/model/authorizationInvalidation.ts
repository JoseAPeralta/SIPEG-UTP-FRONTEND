import type { QueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/app/query/keys";

import type { CollaborationScope } from "./ownPermissions";

/**
 * Fronteras de autorización que un cambio de colaboración deja obsoletas.
 *
 * La asociación actividad→programa no vive en la caché, de modo que un cambio hecho sobre un
 * programa no puede acotarse con seguridad a sus actividades: se invalidan todas las fronteras de
 * colaboración y de permisos propios de la identidad, más el descubrimiento completo. Las consultas
 * activas se reconsultan antes de resolver; las inactivas quedan marcadas para su próxima lectura.
 * Otras identidades y las claves públicas no se tocan.
 */
export async function invalidateCollaborationAuthorization(
  client: QueryClient,
  userId: string,
  scope: CollaborationScope,
): Promise<void> {
  const boundaries =
    scope.type === "program"
      ? [
          client.invalidateQueries({ queryKey: queryKeys.collaboratorsScope(userId) }),
          client.invalidateQueries({ queryKey: queryKeys.ownPermissionsScope(userId) }),
        ]
      : [
          client.invalidateQueries({ queryKey: queryKeys.collaborators(userId, scope) }),
          client.invalidateQueries({ queryKey: queryKeys.ownPermissions(userId, scope) }),
        ];
  await Promise.all([
    ...boundaries,
    client.invalidateQueries({ queryKey: queryKeys.userScopesScope(userId) }),
  ]);
}
