import type { UserScopesAdapter } from "@/app/adapters/contracts";
import type { GlobalRole } from "@/types/domain";
import { mockActivityCatalog } from "@/data/mock/catalog";

import { PERMISSION_NAMES } from "../model/permissions";
import type {
  UserScope,
  UserScopeFilters,
  UserScopeOrganizationalUnit,
  UserScopePermission,
} from "../model/userScopes";

/**
 * El mock de sesion inicia como ADMIN (ver `mockAuthenticatedUser`), asi que reproduce la rama
 * documentada del contrato: catalogo completo con el catalogo de permisos como `LOCAL` y envelopes
 * ilimitados. Los scopes se derivan del catalogo existente para no duplicar nombres ni unidades.
 */

function adminPermissions(): UserScopePermission[] {
  return PERMISSION_NAMES.map((name) => ({
    name,
    origin: "LOCAL",
    validFrom: null,
    validUntil: null,
  }));
}

function compareScopes(left: UserScope, right: UserScope): number {
  return left.name.localeCompare(right.name) || left.id.localeCompare(right.id);
}

export function createMockUserScopesAdapter(
  readRole: () => GlobalRole | undefined = () => "ADMIN",
): UserScopesAdapter {
  const { activities, eventPrograms, organizationalUnits } = mockActivityCatalog;

  function unitReference(unitId: string): UserScopeOrganizationalUnit {
    const unit = organizationalUnits.find((candidate) => candidate.id === unitId);

    if (!unit) {
      throw new Error(`unidad desconocida en el mock: ${unitId}`);
    }

    return { id: unit.id, name: unit.name, type: unit.type };
  }

  const catalog: UserScope[] = [
    ...eventPrograms.map((program): UserScope => ({
      eventProgram: null,
      id: program.id,
      name: program.name,
      organizationalUnit: unitReference(program.organizationalUnitId),
      permissions: adminPermissions(),
      status: program.status,
      type: "program",
    })),
    ...activities.map((activity): UserScope => {
      const program = eventPrograms.find((candidate) => candidate.id === activity.eventProgramId);

      if (!program) {
        throw new Error(`programa desconocido en el mock: ${activity.eventProgramId}`);
      }

      return {
        eventProgram: {
          id: program.id,
          label: program.label,
          name: program.name,
          status: program.status,
        },
        id: activity.id,
        name: activity.name,
        organizationalUnit: unitReference(program.organizationalUnitId),
        permissions: adminPermissions(),
        status: activity.status,
        type: "activity",
      };
    }),
  ].sort(compareScopes);

  return {
    loadUserScopes(filters: UserScopeFilters = {}) {
      if (readRole() !== "ADMIN") return Promise.resolve([]);
      const scopes = filters.type
        ? catalog.filter((scope) => scope.type === filters.type)
        : catalog;

      return Promise.resolve(structuredClone(scopes));
    },
  };
}
