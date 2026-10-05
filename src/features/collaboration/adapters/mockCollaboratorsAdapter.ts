import type { CollaboratorsAdapter } from "@/app/adapters/contracts";
import { collaborationFixtures } from "@/data/mock/collaboration";
import { users } from "@/data/mock/users";
import { eventPrograms } from "@/data/mock/eventPrograms";
import { activities } from "@/data/mock/activities";
import type { EffectiveCollaborator, Collaborator } from "../model/collaborators";
import type { CollaborationScope } from "../model/ownPermissions";
import type { CollaborationRole } from "../model/permissions";
import { hasEffectivePermission } from "../model/operationalCapabilities";

type Options = {
  initial?: { scope: CollaborationScope; collaborators: EffectiveCollaborator[] }[];
  actor?: { isAdmin: boolean; permissions: string[] };
  roleGrants?: Partial<Record<CollaborationRole, string[]>>;
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
}: Options = {}): CollaboratorsAdapter {
  const state = new Map(
    initial.map((item) => [key(item.scope), structuredClone(item.collaborators)]),
  );
  const get = (scope: CollaborationScope) => {
    const program =
      scope.type === "program"
        ? eventPrograms.find((p) => p.id === scope.id)
        : eventPrograms.find(
            (p) => p.id === activities.find((a) => a.id === scope.id)?.eventProgramId,
          );
    if (!program && !state.has(key(scope))) fail(404);
    return state.get(key(scope)) ?? [];
  };
  const authorize = (scope: CollaborationScope, modify = false) => {
    if (!actor.isAdmin && !actor.permissions.includes("permission:grant")) fail(403);
    const programId =
      scope.type === "program"
        ? scope.id
        : activities.find((a) => a.id === scope.id)?.eventProgramId;
    if (modify && eventPrograms.find((p) => p.id === programId)?.status === "ARCHIVED") fail(409);
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
