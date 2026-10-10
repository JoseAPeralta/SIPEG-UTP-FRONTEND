import type { Classroom, ClassroomType } from "@/types/domain";

import type { ClassroomAvailability, ClassroomDetail } from "../model/classroomDetail";

export class ClassroomsMappingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ClassroomsMappingError";
  }
}

const CLASSROOM_TYPES: readonly ClassroomType[] = ["CLASSROOM", "CONFERENCE_ROOM", "LABORATORY"];

/** El contrato numera los dias de lunes a domingo y exige horas HH:mm. */
const ISO_WEEK_DAYS: readonly number[] = [1, 2, 3, 4, 5, 6, 7];
const INSTITUTIONAL_TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

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

function readTime(value: unknown, context: string): string {
  const time = readString(value, context);
  if (!INSTITUTIONAL_TIME.test(time)) {
    fail(context, `fuera del formato HH:mm: ${time}`);
  }
  return time;
}

/**
 * Campos que comparten el resumen del catalogo y el detalle administrativo. Se leen una sola vez
 * para que un cambio de contrato no pueda validar el listado y dejar el detalle sin cubrir.
 */
function readClassroomFields(classroom: Record<string, unknown>, context: string) {
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

export function mapClassroomAvailability(
  raw: unknown,
  context = "classroomAvailability",
): ClassroomAvailability {
  const window = readObject(raw, context);
  const dayOfWeek = readInteger(window["dayOfWeek"], `${context}.dayOfWeek`);
  if (!ISO_WEEK_DAYS.includes(dayOfWeek)) {
    fail(`${context}.dayOfWeek`, `fuera del rango ISO 1-7: ${dayOfWeek}`);
  }

  return {
    dayOfWeek,
    endTime: readTime(window["endTime"], `${context}.endTime`),
    id: readString(window["id"], `${context}.id`),
    period: readNullableString(window["period"], `${context}.period`),
    startTime: readTime(window["startTime"], `${context}.startTime`),
  };
}

export function mapClassroom(raw: unknown, context = "classroom") {
  return readClassroomFields(readObject(raw, context), context);
}

export function mapClassroomDetail(raw: unknown, context = "classroomDetail"): ClassroomDetail {
  const detail = readObject(raw, context);

  return {
    ...readClassroomFields(detail, context),
    availability: readArray(detail["availability"], `${context}.availability`).map(
      (window, index) => mapClassroomAvailability(window, `${context}.availability[${index}]`),
    ),
  };
}

/**
 * Envelope de las operaciones que devuelven `ClassroomDetail`: la creacion, la edicion, las
 * amenidades y la disponibilidad. Reutiliza el mismo validador del listado, porque comparten
 * `success`, `message` y `data`.
 */
export function mapClassroomDetailResponse(
  payload: unknown,
  context = "classroomDetailResponse",
): ClassroomDetail {
  const envelope = readObject(payload, context);
  if (envelope["success"] !== true) fail(`${context}.success`, "debe ser true");
  readString(envelope["message"], `${context}.message`);
  return mapClassroomDetail(envelope["data"], `${context}.data`);
}

/** The availability endpoint uses the standard success envelope but returns an unpaginated summary. */
export function mapAvailableClassroomsResponse(
  payload: unknown,
  context = "availableClassrooms",
): Classroom[] {
  const envelope = readObject(payload, context);
  if (envelope["success"] !== true) fail(`${context}.success`, "debe ser true");
  readString(envelope["message"], `${context}.message`);

  return readArray(envelope["data"], `${context}.data`).map((classroom, index) =>
    mapClassroom(classroom, `${context}.data[${index}]`),
  );
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
