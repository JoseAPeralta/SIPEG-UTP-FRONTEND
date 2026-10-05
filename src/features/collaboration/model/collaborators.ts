import type { CollaborationRole, PermissionName } from "./permissions";
import type { UserScopePermission } from "./userScopes";

export type LocalPermission = {
  name: string;
  source: "ROLE_DEFAULT" | "OVERRIDE";
  validFrom: string | null;
  validUntil: string | null;
};
export type Collaborator = {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  role: CollaborationRole;
  createdAt: string;
  permissions: LocalPermission[];
};
export type EffectiveCollaborator = Omit<Collaborator, "permissions"> & {
  permissions: (LocalPermission & UserScopePermission & { effective: boolean })[];
};
export type AddCollaboratorRequest = { userId: string; role: CollaborationRole };
export type ChangeCollaboratorRoleRequest = { role: CollaborationRole };
/** Concesion directa local; una ventana `null` no vence. */
export type GrantPermissionRequest = {
  userId: string;
  permission: PermissionName;
  validFrom: string | null;
  validUntil: string | null;
};
export type RevokePermissionRequest = { userId: string; permission: PermissionName };
