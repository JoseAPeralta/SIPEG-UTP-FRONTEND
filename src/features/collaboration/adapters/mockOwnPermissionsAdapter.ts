import type { OwnPermissionsAdapter, UserScopesAdapter } from "@/app/adapters/contracts";

export function createMockOwnPermissionsAdapter(scopes: UserScopesAdapter): OwnPermissionsAdapter {
  return {
    async loadOwnPermissions(scope) {
      const found = (await scopes.loadUserScopes()).find(
        (item) => item.id === scope.id && item.type === scope.type,
      );
      if (!found) throw new Error("El contexto de trabajo no está disponible.");
      return { scope: { ...scope }, permissions: found.permissions };
    },
  };
}
