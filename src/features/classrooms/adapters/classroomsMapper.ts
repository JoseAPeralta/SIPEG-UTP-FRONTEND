import type { Classroom, ClassroomType } from "@/types/domain";

export class ClassroomsMappingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ClassroomsMappingError";
  }
}

const CLASSROOM_TYPES: readonly ClassroomType[] = ["CLASSROOM", "LABORATORY"];

function fail(context: string, detail: string): never {
  throw new ClassroomsMappingError(`${context}: ${detail}`);
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

function readNullableInteger(value: unknown, context: string): number | null {
  if (value === null) return null;
  return readInteger(value, context);
}

function readBoolean(value: unknown, context: string): boolean {
  if (typeof value !== "boolean") fail(context, "se esperaba un booleano");
  return value;
}

function readArray(value: unknown, context: string): unknown[] {
  if (!Array.isArray(value)) fail(context, "se esperaba una lista");
  return value;
}

export function mapClassroom(raw: unknown, context = "classroom"): Classroom {
  const classroom = readObject(raw, context);
  const type = classroom["type"];
  if (typeof type !== "string" || !CLASSROOM_TYPES.includes(type as ClassroomType)) {
    fail(`${context}.type`, `valor fuera del contrato: ${String(type)}`);
  }

  return {
    amenities: readArray(classroom["amenities"], `${context}.amenities`).map((amenity, index) =>
      readString(amenity, `${context}.amenities[${index}]`),
    ),
    building: readNullableString(classroom["building"], `${context}.building`),
    capacity: readInteger(classroom["capacity"], `${context}.capacity`),
    floor: readNullableInteger(classroom["floor"], `${context}.floor`),
    id: readString(classroom["id"], `${context}.id`),
    isActive: readBoolean(classroom["isActive"], `${context}.isActive`),
    name: readString(classroom["name"], `${context}.name`),
    type: type as ClassroomType,
  };
}

export function mapClassroomsPage(payload: unknown, context = "classrooms") {
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
      mapClassroom(item, `${context}.data.items[${index}]`),
    ),
    totalPages,
  };
}
