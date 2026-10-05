import type { EventProgramStatus, OrganizationalUnitType } from "@/types/domain";

import {
  isPermissionOrigin,
  isUserScopeStatus,
  isUserScopeType,
  type UserScope,
  type UserScopeEventProgram,
  type UserScopeOrganizationalUnit,
  type UserScopePermission,
  type UserScopesPage,
} from "../model/userScopes";

export class CollaborationMappingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CollaborationMappingError";
  }
}

const EVENT_PROGRAM_STATUSES: readonly EventProgramStatus[] = [
  "DRAFT",
  "ACTIVE",
  "COMPLETED",
  "CANCELLED",
  "ARCHIVED",
];

const ORGANIZATIONAL_UNIT_TYPES: readonly OrganizationalUnitType[] = ["FACULTY", "SUBDIRECTORATE"];

function fail(context: string, detail: string): never {
  throw new CollaborationMappingError(`${context}: ${detail}`);
}

function readObject(value: unknown, context: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    fail(context, "se esperaba un objeto");
  }
  return value as Record<string, unknown>;
}

function readString(value: unknown, context: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    fail(context, "se esperaba un texto no vacio");
  }
  return value;
}

function readNullableString(value: unknown, context: string): string | null {
  if (value === null) return null;
  return readString(value, context);
}

function readArray(value: unknown, context: string): unknown[] {
  if (!Array.isArray(value)) fail(context, "se esperaba una lista");
  return value;
}

function readInteger(value: unknown, context: string): number {
  if (typeof value !== "number" || !Number.isInteger(value)) {
    fail(context, "se esperaba un entero");
  }
  return value;
}

function readEventProgramStatus(value: unknown, context: string): EventProgramStatus {
  if (typeof value !== "string" || !EVENT_PROGRAM_STATUSES.includes(value as EventProgramStatus)) {
    fail(context, `valor fuera del contrato: ${String(value)}`);
  }
  return value as EventProgramStatus;
}

function readUnitType(value: unknown, context: string): OrganizationalUnitType {
  if (
    typeof value !== "string" ||
    !ORGANIZATIONAL_UNIT_TYPES.includes(value as OrganizationalUnitType)
  ) {
    fail(context, `valor fuera del contrato: ${String(value)}`);
  }
  return value as OrganizationalUnitType;
}

function readUserScopeType(value: unknown, context: string): UserScope["type"] {
  if (!isUserScopeType(value)) fail(context, `valor fuera del contrato: ${String(value)}`);
  return value;
}

function readUserScopeStatus(value: unknown, context: string): UserScope["status"] {
  if (!isUserScopeStatus(value)) fail(context, `valor fuera del contrato: ${String(value)}`);
  return value;
}

function readPermission(value: unknown, context: string): UserScopePermission {
  const permission = readObject(value, context);
  const origin = permission["origin"];

  if (!isPermissionOrigin(origin)) {
    fail(`${context}.origin`, `valor fuera del contrato: ${String(origin)}`);
  }

  return {
    name: readString(permission["name"], `${context}.name`),
    origin,
    validFrom: readNullableString(permission["validFrom"], `${context}.validFrom`),
    validUntil: readNullableString(permission["validUntil"], `${context}.validUntil`),
  };
}

function readOrganizationalUnit(value: unknown, context: string): UserScopeOrganizationalUnit {
  const unit = readObject(value, context);

  return {
    id: readString(unit["id"], `${context}.id`),
    name: readString(unit["name"], `${context}.name`),
    type: readUnitType(unit["type"], `${context}.type`),
  };
}

function readEventProgram(value: unknown, context: string): UserScopeEventProgram | null {
  if (value === null) return null;
  const program = readObject(value, context);

  return {
    id: readString(program["id"], `${context}.id`),
    label: readNullableString(program["label"], `${context}.label`),
    name: readString(program["name"], `${context}.name`),
    status: readEventProgramStatus(program["status"], `${context}.status`),
  };
}

export function mapUserScope(raw: unknown, context = "userScope"): UserScope {
  const scope = readObject(raw, context);

  return {
    eventProgram: readEventProgram(scope["eventProgram"], `${context}.eventProgram`),
    id: readString(scope["id"], `${context}.id`),
    name: readString(scope["name"], `${context}.name`),
    organizationalUnit: readOrganizationalUnit(
      scope["organizationalUnit"],
      `${context}.organizationalUnit`,
    ),
    permissions: readArray(scope["permissions"], `${context}.permissions`).map(
      (permission, index) => readPermission(permission, `${context}.permissions[${index}]`),
    ),
    status: readUserScopeStatus(scope["status"], `${context}.status`),
    type: readUserScopeType(scope["type"], `${context}.type`),
  };
}

export function mapUserScopesPage(payload: unknown, context = "userScopes"): UserScopesPage {
  const envelope = readObject(payload, context);
  if (envelope["success"] !== true) fail(`${context}.success`, "debe ser true");
  readString(envelope["message"], `${context}.message`);
  const data = readObject(envelope["data"], `${context}.data`);

  return {
    items: readArray(data["items"], `${context}.data.items`).map((item, index) =>
      mapUserScope(item, `${context}.data.items[${index}]`),
    ),
    limit: readInteger(data["limit"], `${context}.data.limit`),
    page: readInteger(data["page"], `${context}.data.page`),
    total: readInteger(data["total"], `${context}.data.total`),
    totalPages: readInteger(data["totalPages"], `${context}.data.totalPages`),
  };
}
