import type { CollaboratorsAdapter } from "@/app/adapters/contracts";
import { collaborationFixtures } from "@/data/mock/collaboration";
import { users } from "@/data/mock/users";
import { eventPrograms } from "@/data/mock/eventPrograms";
import { activities } from "@/data/mock/activities";
import type { EventProgramStatus } from "@/types/domain";
import type { EffectiveCollaborator, Collaborator } from "../model/collaborators";
import type { CollaborationScope } from "../model/ownPermissions";
import type { CollaborationRole } from "../model/permissions";
import { hasEffectivePermission } from "../model/operationalCapabilities";

type Options = {
  initial?: { scope: CollaborationScope; collaborators: EffectiveCollaborator[] }[];
  actor?: { isAdmin: boolean; permissions: string[] };
  roleGrants?: Partial<Record<CollaborationRole, string[]>>;
  /** Estado vivo del programa en la misma composicion; sin el, el fixture sigue siendo la unica fuente. */
  readProgramState?: (programId: string) => EventProgramStatus | null | undefined;
  /**
   * Programa vivo de una actividad de la composicion. `undefined` marca una actividad eliminada,
   * de modo que su scope responda como recurso inexistente aunque conserve una entrada de fixture.
   */
  readActivityProgramId?: (activityId: string) => string | null | undefined;
};
function fail(status: number): never {
  throw Object.assign(new Error("La operación de colaboración fue rechazada."), { status });
}
const key = (scope: CollaborationScope) => `${scope.type}:${scope.id}`;
function localResponse(person: EffectiveCollaborator): Collaborator {
  return {
    ...person,
    permissions: person.permissions
      .filter((p) => p.origin !== "INHERITED")
      .map(({ name, source, validFrom, validUntil }) => ({ name, source, validFrom, validUntil })),
  };
}
/** Fixture mutable aislado por composition root; los defaults por rol solo se inyectan en escenarios de prueba. */
export function createMockCollaboratorsAdapter({
  initial = collaborationFixtures,
  actor = { isAdmin: true, permissions: [] },
  roleGrants = {},
  readProgramState,
  readActivityProgramId,
}: Options = {}): CollaboratorsAdapter {
  const state = new Map(
    initial.map((item) => [key(item.scope), structuredClone(item.collaborators)]),
  );
  const programIdOf = (scope: CollaborationScope): string | null | undefined =>
    scope.type === "program"
      ? scope.id
      : readActivityProgramId
        ? readActivityProgramId(scope.id)
        : activities.find((activity) => activity.id === scope.id)?.eventProgramId;
  const programStateOf = (scope: CollaborationScope) => {
    const programId = programIdOf(scope);
    const program = programId
      ? eventPrograms.find((candidate) => candidate.id === programId)
      : undefined;
    const readStatus = programId ? readProgramState?.(programId) : undefined;

    return {
      exists: Boolean(program) || (readStatus !== undefined && readStatus !== null),
      status: readStatus ?? program?.status,
    };
  };
  const get = (scope: CollaborationScope) => {
    const { exists } = programStateOf(scope);

    if (!exists && (scope.type === "activity" || !state.has(key(scope)))) fail(404);
    return state.get(key(scope)) ?? [];
  };
  const authorize = (scope: CollaborationScope, modify = false) => {
    if (!actor.isAdmin && !actor.permissions.includes("permission:grant")) fail(403);
    if (modify && programStateOf(scope).status === "ARCHIVED") fail(409);
  };
  const allowed = (names: string[]) => {
    if (!actor.isAdmin && names.some((name) => !actor.permissions.includes(name))) fail(403);
  };
  const canDelegate = (person: EffectiveCollaborator) =>
    users.some(
      (user) =>
        user.id === person.userId &&
        user.isActive &&
        (user.globalRole === "ADMIN" ||
          hasEffectivePermission(person.permissions, "permission:grant")),
    );
  return {
    async loadCollaborators(scope) {
      await Promise.resolve();
      authorize(scope);
      return structuredClone(get(scope));
    },
    async addCollaborator(scope, input) {
      await Promise.resolve();
      authorize(scope, true);
      const people = get(scope);
      if (people.some((person) => person.userId === input.userId)) fail(409);
      const user = users.find((u) => u.id === input.userId);
      if (!user) fail(404);
      if (!user.isActive) fail(400);
      const grants = roleGrants[input.role] ?? [];
      allowed(grants);
      const person: EffectiveCollaborator = {
        userId: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: input.role,
        createdAt: new Date().toISOString(),
        permissions: grants.map((name) => ({
          name,
          source: "ROLE_DEFAULT",
          origin: "LOCAL",
          effective: true,
          validFrom: null,
          validUntil: null,
        })),
      };
      state.set(key(scope), [...people, person]);
      return localResponse(structuredClone(person));
    },
    async changeCollaboratorRole(scope, userId, input) {
      await Promise.resolve();
      authorize(scope, true);
      const people = get(scope);
      const person = people.find((p) => p.userId === userId);
      if (!person) fail(404);
      const grants = roleGrants[input.role] ?? [];
      allowed([
        ...grants,
        ...person.permissions
          .filter((p) => p.source === "ROLE_DEFAULT" && p.origin !== "INHERITED")
          .map((p) => p.name),
      ]);
      const updated: EffectiveCollaborator = {
        ...person,
        role: input.role,
        permissions: [
          ...person.permissions.filter((p) => p.source === "OVERRIDE" || p.origin === "INHERITED"),
          ...grants.map((name) => ({
            name,
            source: "ROLE_DEFAULT" as const,
            origin: "LOCAL" as const,
            effective: true,
            validFrom: null,
            validUntil: null,
          })),
        ],
      };
      if (!people.map((p) => (p.userId === userId ? updated : p)).some(canDelegate)) fail(409);
      state.set(
        key(scope),
        people.map((p) => (p.userId === userId ? updated : p)),
      );
      return localResponse(structuredClone(updated));
    },
    async grantPermission(scope, input) {
      await Promise.resolve();
      authorize(scope, true);
      const people = get(scope);
      const person = people.find((p) => p.userId === input.userId);
      if (!person) fail(404);
      allowed([input.permission]);
      const existing = person.permissions.find((p) => p.name === input.permission);
      const grant: EffectiveCollaborator["permissions"][number] = {
        name: input.permission,
        source: "OVERRIDE",
        origin: existing && existing.origin !== "LOCAL" ? "BOTH" : "LOCAL",
        effective: true,
        validFrom: input.validFrom,
        validUntil: input.validUntil,
      };
      const updated: EffectiveCollaborator = {
        ...person,
        permissions: [...person.permissions.filter((p) => p.name !== input.permission), grant],
      };
      state.set(
        key(scope),
        people.map((p) => (p.userId === input.userId ? updated : p)),
      );
      return localResponse(structuredClone(updated));
    },
    async revokePermission(scope, input) {
      await Promise.resolve();
      authorize(scope, true);
      const people = get(scope);
      const person = people.find((p) => p.userId === input.userId);
      if (!person) fail(404);
      allowed([input.permission]);
      const local = person.permissions.some(
        (p) => p.name === input.permission && p.origin !== "INHERITED",
      );
      if (!local) fail(person.permissions.some((p) => p.name === input.permission) ? 409 : 404);
      const updated: EffectiveCollaborator = {
        ...person,
        permissions: person.permissions.flatMap((p) => {
          if (p.name !== input.permission) return [p];
          if (p.origin === "BOTH")
            return [{ ...p, source: "ROLE_DEFAULT" as const, origin: "INHERITED" as const }];
          return [];
        }),
      };
      const remaining = people.map((p) => (p.userId === input.userId ? updated : p));
      if (input.permission === "permission:grant" && !remaining.some(canDelegate)) fail(409);
      state.set(key(scope), remaining);
    },
    async removeCollaborator(scope, userId) {
      await Promise.resolve();
      authorize(scope, true);
      const people = get(scope);
      const person = people.find((p) => p.userId === userId);
      if (!person) fail(404);
      allowed(person.permissions.map((p) => p.name));
      const remaining = people.filter((p) => p.userId !== userId);
      if (!remaining.some(canDelegate)) fail(409);
      state.set(key(scope), remaining);
    },
  };
}
