import type { UserScope, UserScopePermission } from "./userScopes";

export type CollaborationScope = Pick<UserScope, "type" | "id">;
export type OwnPermissions = { scope: CollaborationScope; permissions: UserScopePermission[] };
export type PermissionListItem = UserScopePermission & {
  source?: "ROLE_DEFAULT" | "OVERRIDE";
  effective?: boolean;
};
