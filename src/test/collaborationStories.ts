import { createAppAdapters, type AppAdapters } from "@/app/adapters";
import { useSessionStore } from "@/store/session";
import { createAuthenticatedUser, createAuthTokens, createUserScope } from "./factories";
import type { EffectiveCollaborator } from "@/features/collaboration/model/collaborators";
import type { UserScopePermission } from "@/features/collaboration/model/userScopes";

export type CollaborationScenario =
  | "read"
  | "edit"
  | "manage"
  | "admin"
  | "empty"
  | "error"
  | "conflict"
  | "listError"
  | "archived"
  | "loading"
  | "revocation";
export const storyScope = { type: "activity" as const, id: "story-activity" };
export function collaborationStorySession(admin = false) {
  useSessionStore.getState().setSession({
    currentUser: createAuthenticatedUser({ globalRole: admin ? "ADMIN" : "USER" }),
    tokens: createAuthTokens(),
  });
  return () => useSessionStore.getState().clearSession();
}
export function scenarioAdapters(scenario: CollaborationScenario): AppAdapters {
  const grants =
    scenario === "edit"
      ? ["activity:read", "activity:update"]
      : scenario === "read"
        ? ["activity:read"]
        : ["activity:read", "permission:grant"];
  let permissions: UserScopePermission[] = grants.map((name) => ({
    name,
    origin: "INHERITED",
    validFrom: null,
    validUntil: null,
  }));
  const scope = createUserScope({
    ...storyScope,
    name: "Taller de colaboración académica",
    status: scenario === "archived" ? "ARCHIVED" : "DRAFT",
    permissions,
  });
  let people: EffectiveCollaborator[] =
    scenario === "empty"
      ? []
      : [
          {
            userId: "story-person",
            firstName: "Ana",
            lastName: "Pérez",
            email: "ana@example.test",
            role: "VIEWER",
            createdAt: "2026-01-01T00:00:00Z",
            permissions: [
              {
                name: "activity:read",
                source: "ROLE_DEFAULT",
                origin: "INHERITED",
                effective: true,
                validFrom: null,
                validUntil: null,
              },
              {
                name: "activity:update",
                source: "OVERRIDE",
                origin: "LOCAL",
                effective: true,
                validFrom: null,
                validUntil: null,
              },
            ],
          },
        ];
  return {
    ...createAppAdapters({ source: "mock" }),
    userScopes: {
      loadUserScopes: () =>
        scenario === "loading"
          ? new Promise(() => undefined)
          : scenario === "error"
            ? Promise.reject(new Error("Servicio no disponible"))
            : Promise.resolve(scenario === "empty" ? [] : [scope]),
    },
    ownPermissions: {
      loadOwnPermissions: () => Promise.resolve({ scope: storyScope, permissions }),
    },
    collaborators: {
      loadCollaborators: () =>
        scenario === "listError"
          ? Promise.reject(new Error("Servicio no disponible"))
          : Promise.resolve(structuredClone(people)),
      addCollaborator: (_scope, input) => {
        const person: EffectiveCollaborator = {
          userId: input.userId,
          firstName: "Nueva",
          lastName: "Persona",
          email: "persona@example.test",
          role: input.role,
          createdAt: "2026-01-01T00:00:00Z",
          permissions: [],
        };
        people = [...people, person];
        return Promise.resolve(person);
      },
      changeCollaboratorRole: (_scope, id, input) => {
        const person = people.find((p) => p.userId === id)!;
        const updated = { ...person, role: input.role };
        people = people.map((p) => (p.userId === id ? updated : p));
        return Promise.resolve(updated);
      },
      grantPermission: (_scope, input) => {
        const person = people.find((p) => p.userId === input.userId)!;
        const updated: EffectiveCollaborator = {
          ...person,
          permissions: [
            ...person.permissions.filter((item) => item.name !== input.permission),
            {
              name: input.permission,
              source: "OVERRIDE",
              origin: "LOCAL",
              effective: true,
              validFrom: input.validFrom,
              validUntil: input.validUntil,
            },
          ],
        };
        people = people.map((p) => (p.userId === input.userId ? updated : p));
        return Promise.resolve({
          ...updated,
          permissions: updated.permissions.map(({ name, source, validFrom, validUntil }) => ({
            name,
            source,
            validFrom,
            validUntil,
          })),
        });
      },
      revokePermission: (_scope, input) => {
        if (scenario === "conflict")
          return Promise.reject(Object.assign(new Error("Conflicto"), { status: 409 }));
        people = people.map((p) =>
          p.userId === input.userId
            ? {
                ...p,
                permissions: p.permissions.filter(
                  (item) => item.name !== input.permission || item.origin === "INHERITED",
                ),
              }
            : p,
        );
        return Promise.resolve();
      },
      removeCollaborator: (_scope, id) => {
        if (scenario === "conflict")
          return Promise.reject(Object.assign(new Error("Conflicto"), { status: 409 }));
        people = people.filter((p) => p.userId !== id);
        if (scenario === "revocation") {
          permissions = permissions.filter((permission) => permission.name !== "permission:grant");
          scope.permissions = permissions;
        }
        return Promise.resolve();
      },
    },
  };
}
