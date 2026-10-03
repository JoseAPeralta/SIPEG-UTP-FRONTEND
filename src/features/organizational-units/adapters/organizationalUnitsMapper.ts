import type { OrganizationalUnit, OrganizationalUnitType } from "@/types/domain";

export class OrganizationalUnitsMappingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OrganizationalUnitsMappingError";
  }
}

const UNIT_TYPES: readonly OrganizationalUnitType[] = ["FACULTY", "SUBDIRECTORATE"];

function fail(context: string, detail: string): never {
  throw new OrganizationalUnitsMappingError(`${context}: ${detail}`);
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

function mapHead(value: unknown, context: string): OrganizationalUnit["head"] {
  if (value === null) return null;
  const head = readObject(value, context);

  return {
    firstName: readString(head["firstName"], `${context}.firstName`),
    id: readString(head["id"], `${context}.id`),
    lastName: readString(head["lastName"], `${context}.lastName`),
  };
}

export function mapOrganizationalUnit(
  raw: unknown,
  context = "organizationalUnit",
): OrganizationalUnit {
  const unit = readObject(raw, context);
  const type = unit["type"];

  if (typeof type !== "string" || !UNIT_TYPES.includes(type as OrganizationalUnitType)) {
    fail(`${context}.type`, `valor fuera del contrato: ${String(type)}`);
  }

  return {
    code: readString(unit["code"], `${context}.code`),
    description: readNullableString(unit["description"], `${context}.description`),
    head: mapHead(unit["head"], `${context}.head`),
    id: readString(unit["id"], `${context}.id`),
    isActive: readBoolean(unit["isActive"], `${context}.isActive`),
    name: readString(unit["name"], `${context}.name`),
    type: type as OrganizationalUnitType,
  };
}

export function mapOrganizationalUnitsPage(payload: unknown, context = "organizationalUnits") {
  const envelope = readObject(payload, context);
  if (envelope["success"] !== true) fail(`${context}.success`, "debe ser true");
  readString(envelope["message"], `${context}.message`);
  const data = readObject(envelope["data"], `${context}.data`);
  readInteger(data["page"], `${context}.data.page`);
  readInteger(data["limit"], `${context}.data.limit`);
  readInteger(data["total"], `${context}.data.total`);
  const totalPages = readInteger(data["totalPages"], `${context}.data.totalPages`);

  return {
    items: readArray(data["items"], `${context}.data.items`).map((item, index) =>
      mapOrganizationalUnit(item, `${context}.data.items[${index}]`),
    ),
    totalPages,
  };
}
