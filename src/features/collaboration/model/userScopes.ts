import type { EventProgramStatus, OrganizationalUnitType } from "@/types/domain";

/**
 * Modelo de los scopes accesibles del usuario (`UserScope` del descubrimiento propio).
 *
 * El backend es la autoridad de autorizacion: este modulo solo tipa y valida la
 * respuesta. Los nombres de permiso llegan como texto libre (la respuesta no los
 * publica como enum), de modo que no se comparan contra el catalogo canonico; la
 * presentacion resuelve la etiqueta con `resolvePermissionLabel`.
 */

export const USER_SCOPE_TYPES = ["program", "activity"] as const;

export const USER_SCOPE_STATUSES = [
  "DRAFT",
  "ACTIVE",
  "COMPLETED",
  "CANCELLED",
  "ARCHIVED",
  "SCHEDULED",
  "ONGOING",
] as const;

export const PERMISSION_ORIGINS = ["LOCAL", "INHERITED", "BOTH"] as const;

export type UserScopeType = (typeof USER_SCOPE_TYPES)[number];

export type UserScopeStatus = (typeof USER_SCOPE_STATUSES)[number];

export type PermissionOrigin = (typeof PERMISSION_ORIGINS)[number];

export type UserScopePermission = {
  name: string;
  origin: PermissionOrigin;
  validFrom: string | null;
  validUntil: string | null;
};

export type UserScopeEventProgram = {
  id: string;
  label: string | null;
  name: string;
  status: EventProgramStatus;
};

export type UserScopeOrganizationalUnit = {
  id: string;
  name: string;
  type: OrganizationalUnitType;
};

export type UserScope = {
  eventProgram: UserScopeEventProgram | null;
  id: string;
  name: string;
  organizationalUnit: UserScopeOrganizationalUnit;
  permissions: UserScopePermission[];
  status: UserScopeStatus;
  type: UserScopeType;
};

export type UserScopesPage = {
  items: UserScope[];
  limit: number;
  page: number;
  total: number;
  totalPages: number;
};

export type UserScopeFilters = {
  type?: UserScopeType;
};

export function isUserScopeType(value: unknown): value is UserScopeType {
  return typeof value === "string" && (USER_SCOPE_TYPES as readonly string[]).includes(value);
}

export function isUserScopeStatus(value: unknown): value is UserScopeStatus {
  return typeof value === "string" && (USER_SCOPE_STATUSES as readonly string[]).includes(value);
}

export function isPermissionOrigin(value: unknown): value is PermissionOrigin {
  return typeof value === "string" && (PERMISSION_ORIGINS as readonly string[]).includes(value);
}
