import type {
  Career,
  OrganizationalUnit,
  OrganizationalUnitType,
  RegistrationResult,
} from "@/types/domain";

export class RegistrationMappingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RegistrationMappingError";
  }
}

function fail(context: string, detail: string): never {
  throw new RegistrationMappingError(`${context}: ${detail}`);
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
  if (value === null) {
    return null;
  }

  return readString(value, context);
}

function readBoolean(value: unknown, context: string): boolean {
  if (typeof value !== "boolean") {
    fail(context, "se esperaba un booleano");
  }

  return value;
}

function readNumber(value: unknown, context: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    fail(context, "se esperaba un numero");
  }

  return value;
}

function readArray(value: unknown, context: string): unknown[] {
  if (!Array.isArray(value)) {
    fail(context, "se esperaba una lista");
  }

  return value;
}

function readUnitType(value: unknown, context: string): OrganizationalUnitType {
  if (value !== "FACULTY" && value !== "SUBDIRECTORATE") {
    fail(context, "tipo de unidad fuera del contrato");
  }

  return value;
}

export function readRegistrationEnvelopeData(payload: unknown, context: string): unknown {
  const envelope = readObject(payload, context);

  if (envelope["success"] !== true) {
    fail(`${context}.success`, "debe ser true");
  }

  readString(envelope["message"], `${context}.message`);

  if (!("data" in envelope)) {
    fail(`${context}.data`, "es obligatorio");
  }

  return envelope["data"];
}

export function readRegistrationPage(payload: unknown, context: string) {
  const data = readObject(readRegistrationEnvelopeData(payload, context), `${context}.data`);

  return {
    items: readArray(data["items"], `${context}.data.items`),
    totalPages: readNumber(data["totalPages"], `${context}.data.totalPages`),
  };
}

export function mapRegistrationUnit(
  raw: unknown,
  context = "organizationalUnit",
): OrganizationalUnit {
  const unit = readObject(raw, context);
  const headValue = unit["head"];
  let head: OrganizationalUnit["head"] = null;

  if (headValue !== null) {
    const headRecord = readObject(headValue, `${context}.head`);
    head = {
      firstName: readString(headRecord["firstName"], `${context}.head.firstName`),
      id: readString(headRecord["id"], `${context}.head.id`),
      lastName: readString(headRecord["lastName"], `${context}.head.lastName`),
    };
  }

  return {
    code: readString(unit["code"], `${context}.code`),
    description: readNullableString(unit["description"], `${context}.description`),
    head,
    id: readString(unit["id"], `${context}.id`),
    isActive: readBoolean(unit["isActive"], `${context}.isActive`),
    name: readString(unit["name"], `${context}.name`),
    type: readUnitType(unit["type"], `${context}.type`),
  };
}

export function mapRegistrationCareer(raw: unknown, context = "career"): Career {
  const career = readObject(raw, context);
  const unitValue = career["unit"];
  let unitId: string | null = null;

  if (unitValue !== null) {
    const unit = readObject(unitValue, `${context}.unit`);
    unitId = readString(unit["id"], `${context}.unit.id`);
    readString(unit["code"], `${context}.unit.code`);
    readString(unit["name"], `${context}.unit.name`);
  }

  readNullableString(career["description"], `${context}.description`);

  return {
    code: readString(career["code"], `${context}.code`),
    id: readString(career["id"], `${context}.id`),
    name: readString(career["name"], `${context}.name`),
    unitId,
  };
}

export function mapRegistrationResult(
  raw: unknown,
  context = "auth.register.data",
): RegistrationResult {
  const result = readObject(raw, context);

  return { userId: readString(result["userId"], `${context}.userId`) };
}
