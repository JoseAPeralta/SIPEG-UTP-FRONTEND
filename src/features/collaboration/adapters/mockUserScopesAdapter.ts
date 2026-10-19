import type { UserScopesAdapter } from "@/app/adapters/contracts";
import type { Activity, EventProgram, GlobalRole } from "@/types/domain";
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
 * ilimitados. Los programas y las actividades vigentes se leen en cada consulta desde la
 * composicion, de modo que un programa creado, archivado o reactivado, o una actividad creada o
 * eliminada en ella, descubran su estado real en lugar del fixture congelado.
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
  readEventPrograms: () => EventProgram[] = () => mockActivityCatalog.eventPrograms,
  readActivities: () => readonly Activity[] = () => mockActivityCatalog.activities,
): UserScopesAdapter {
  const { eventPrograms: fixturePrograms, organizationalUnits } = mockActivityCatalog;

  function unitReference(unitId: string): UserScopeOrganizationalUnit {
    const unit = organizationalUnits.find((candidate) => candidate.id === unitId);

    if (!unit) {
      throw new Error(`unidad desconocida en el mock: ${unitId}`);
    }

    return { id: unit.id, name: unit.name, type: unit.type };
  }

  function buildCatalog(): UserScope[] {
    const byId = new Map(readEventPrograms().map((program) => [program.id, program]));

    for (const program of fixturePrograms) {
      if (!byId.has(program.id)) byId.set(program.id, program);
    }
    const programs = [...byId.values()];

    return [
      ...programs.map((program): UserScope => ({
        eventProgram: null,
        id: program.id,
        name: program.name,
        organizationalUnit: unitReference(program.organizationalUnitId),
        permissions: adminPermissions(),
        status: program.status,
        type: "program",
      })),
      ...readActivities().map((activity): UserScope => {
        const program = byId.get(activity.eventProgramId);

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
  }

  return {
    loadUserScopes(filters: UserScopeFilters = {}) {
      if (readRole() !== "ADMIN") return Promise.resolve([]);
      const scopes = buildCatalog();

      return Promise.resolve(
        structuredClone(
          filters.type ? scopes.filter((scope) => scope.type === filters.type) : scopes,
        ),
      );
    },
  };
}
