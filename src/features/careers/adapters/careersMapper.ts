import type { Career } from "@/types/domain";

export class CareersMappingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CareersMappingError";
  }
}

function fail(context: string, detail: string): never {
  throw new CareersMappingError(`${context}: ${detail}`);
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

export function mapCareer(raw: unknown, context = "career"): Career {
  const career = readObject(raw, context);
  const unitValue = career["unit"];
  let unitId: string | null = null;

  readNullableString(career["description"], `${context}.description`);
  if (unitValue !== null) {
    const unit = readObject(unitValue, `${context}.unit`);
    unitId = readString(unit["id"], `${context}.unit.id`);
    readString(unit["code"], `${context}.unit.code`);
    readString(unit["name"], `${context}.unit.name`);
  }

  return {
    code: readString(career["code"], `${context}.code`),
    description: readNullableString(career["description"], `${context}.description`),
    id: readString(career["id"], `${context}.id`),
    name: readString(career["name"], `${context}.name`),
    unitId,
  };
}

export function mapCareerResponse(payload: unknown, context = "careerResponse"): Career {
  const envelope = readObject(payload, context);
  if (envelope["success"] !== true) fail(`${context}.success`, "debe ser true");
  readString(envelope["message"], `${context}.message`);
  return mapCareer(envelope["data"], `${context}.data`);
}

export function mapCareersPage(payload: unknown, context = "careers") {
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
      mapCareer(item, `${context}.data.items[${index}]`),
    ),
    totalPages,
  };
}
