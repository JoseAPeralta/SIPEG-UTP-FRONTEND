import type { PermissionName } from "./permissions";
import type { CollaborationScope } from "./ownPermissions";
import type { UserScope, UserScopePermission } from "./userScopes";

/** Ventanas acotadas se comprueban otra vez localmente para no habilitar permisos ya vencidos. */
export function hasEffectivePermission(
  permissions: readonly UserScopePermission[],
  name: PermissionName,
  now = Date.now(),
): boolean {
  return permissions.some(
    (permission) =>
      permission.name === name &&
      (permission.validFrom === null || Date.parse(permission.validFrom) <= now) &&
      (permission.validUntil === null || now < Date.parse(permission.validUntil)),
  );
}
export function hasScopeCapability(
  scopes: readonly UserScope[],
  scope: CollaborationScope,
  name: PermissionName,
  now = Date.now(),
): boolean {
  const found = scopes.find((item) => item.id === scope.id && item.type === scope.type);
  return Boolean(found && hasEffectivePermission(found.permissions, name, now));
}
