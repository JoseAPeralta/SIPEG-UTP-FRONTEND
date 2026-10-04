import type { GlobalRole, OrganizationReference } from "@/types/domain";

import type { AdminUser, AdminUsersPage } from "../model/adminUser";

export class AdminUsersMappingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AdminUsersMappingError";
  }
}

const GLOBAL_ROLES: readonly GlobalRole[] = ["ADMIN", "USER"];

function fail(context: string, detail: string): never {
  throw new AdminUsersMappingError(`${context}: ${detail}`);
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

function readBoolean(value: unknown, context: string): boolean {
  if (typeof value !== "boolean") fail(context, "se esperaba un booleano");
  return value;
}

function readInteger(value: unknown, context: string): number {
  if (typeof value !== "number" || !Number.isInteger(value)) {
    fail(context, "se esperaba un entero");
  }
  return value;
}

function readArray(value: unknown, context: string): unknown[] {
  if (!Array.isArray(value)) fail(context, "se esperaba una lista");
  return value;
}

function readGlobalRole(value: unknown, context: string): GlobalRole {
  if (typeof value !== "string" || !GLOBAL_ROLES.includes(value as GlobalRole)) {
    fail(context, `valor fuera del contrato: ${String(value)}`);
  }
  return value as GlobalRole;
}

function readOrganizationReference(value: unknown, context: string): OrganizationReference | null {
  if (value === null) return null;
  const reference = readObject(value, context);

  return {
    code: readString(reference["code"], `${context}.code`),
    id: readString(reference["id"], `${context}.id`),
    name: readString(reference["name"], `${context}.name`),
  };
}

export function mapAdminUser(raw: unknown, context = "adminUser"): AdminUser {
  const user = readObject(raw, context);

  return {
    career: readOrganizationReference(user["career"], `${context}.career`),
    email: readString(user["email"], `${context}.email`),
    firstName: readString(user["firstName"], `${context}.firstName`),
    globalRole: readGlobalRole(user["globalRole"], `${context}.globalRole`),
    id: readString(user["id"], `${context}.id`),
    identificationNumber: readString(
      user["identificationNumber"],
      `${context}.identificationNumber`,
    ),
    isActive: readBoolean(user["isActive"], `${context}.isActive`),
    lastName: readString(user["lastName"], `${context}.lastName`),
    unit: readOrganizationReference(user["unit"], `${context}.unit`),
  };
}

export function mapAdminUsersPage(payload: unknown, context = "adminUsers"): AdminUsersPage {
  const envelope = readObject(payload, context);
  if (envelope["success"] !== true) fail(`${context}.success`, "debe ser true");
  readString(envelope["message"], `${context}.message`);
  const data = readObject(envelope["data"], `${context}.data`);

  return {
    items: readArray(data["items"], `${context}.data.items`).map((item, index) =>
      mapAdminUser(item, `${context}.data.items[${index}]`),
    ),
    limit: readInteger(data["limit"], `${context}.data.limit`),
    page: readInteger(data["page"], `${context}.data.page`),
    total: readInteger(data["total"], `${context}.data.total`),
    totalPages: readInteger(data["totalPages"], `${context}.data.totalPages`),
  };
}
