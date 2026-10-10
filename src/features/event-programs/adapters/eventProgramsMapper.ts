import type { EventProgram, EventProgramStatus, OrganizationalUnitType } from "@/types/domain";
import type { EventProgramListItem, EventProgramListUnit } from "../model/eventProgramList";

export class EventProgramsMappingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EventProgramsMappingError";
  }
}

const statuses: readonly EventProgramStatus[] = [
  "DRAFT",
  "ACTIVE",
  "COMPLETED",
  "CANCELLED",
  "ARCHIVED",
];
const unitTypes: readonly OrganizationalUnitType[] = ["FACULTY", "SUBDIRECTORATE"];

function fail(context: string): never {
  throw new EventProgramsMappingError(`${context}: valor fuera del contrato`);
}

function object(value: unknown, context: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) fail(context);
  return value as Record<string, unknown>;
}

function text(value: unknown, context: string): string {
  if (typeof value !== "string") fail(context);
  return value;
}

function nullableText(value: unknown, context: string): string | null {
  return value === null ? null : text(value, context);
}

function integer(value: unknown, context: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value)) fail(context);
  return value;
}

function enumeration<T extends string>(value: unknown, allowed: readonly T[], context: string): T {
  if (typeof value !== "string" || !allowed.includes(value as T)) fail(context);
  return value as T;
}

export function mapEventProgram(raw: unknown, context = "eventProgram"): EventProgram {
  const program = object(raw, context);
  const unit = object(program["organizationalUnit"], `${context}.organizationalUnit`);
  text(unit["name"], `${context}.organizationalUnit.name`);
  enumeration(unit["type"], unitTypes, `${context}.organizationalUnit.type`);
  const isDefault = program["isDefault"];
  if (typeof isDefault !== "boolean") fail(`${context}.isDefault`);

  return {
    bannerUrl: nullableText(program["bannerUrl"], `${context}.bannerUrl`),
    description: nullableText(program["description"], `${context}.description`),
    endDate: nullableText(program["endDate"], `${context}.endDate`),
    id: text(program["id"], `${context}.id`),
    isDefault,
    label: nullableText(program["label"], `${context}.label`),
    name: text(program["name"], `${context}.name`),
    organizationalUnitId: text(unit["id"], `${context}.organizationalUnit.id`),
    startDate: nullableText(program["startDate"], `${context}.startDate`),
    status: enumeration(program["status"], statuses, `${context}.status`),
  };
}

function readEventProgramsPage(payload: unknown, context: string) {
  const envelope = object(payload, context);
  if (envelope["success"] !== true) fail(`${context}.success`);
  text(envelope["message"], `${context}.message`);
  const data = object(envelope["data"], `${context}.data`);
  const items = data["items"];
  if (!Array.isArray(items)) fail(`${context}.data.items`);

  return {
    items,
    limit: integer(data["limit"], `${context}.data.limit`),
    page: integer(data["page"], `${context}.data.page`),
    total: integer(data["total"], `${context}.data.total`),
    totalPages: integer(data["totalPages"], `${context}.data.totalPages`),
  };
}

export function mapEventProgramsPage(payload: unknown, context = "eventPrograms") {
  const page = readEventProgramsPage(payload, context);

  return {
    ...page,
    items: page.items.map((item, index) =>
      mapEventProgram(item, `${context}.data.items[${index}]`),
    ),
  };
}

/** Envelope de mutación: el detalle viaja directamente en `data`, sin paginación. */
export function mapMutatedEventProgram(payload: unknown, context = "eventProgram.mutation") {
  const envelope = object(payload, context);
  if (envelope["success"] !== true) fail(`${context}.success`);
  text(envelope["message"], `${context}.message`);

  return mapEventProgram(envelope["data"], `${context}.data`);
}

function mapEventProgramListUnit(raw: unknown, context: string): EventProgramListUnit {
  const unit = object(raw, context);

  return {
    id: text(unit["id"], `${context}.id`),
    name: text(unit["name"], `${context}.name`),
    type: enumeration(unit["type"], unitTypes, `${context}.type`),
  };
}

function mapEventProgramListItem(raw: unknown, context: string): EventProgramListItem {
  const program = mapEventProgram(raw, context);
  const value = object(raw, context);

  return {
    ...program,
    organizationalUnit: mapEventProgramListUnit(
      value["organizationalUnit"],
      `${context}.organizationalUnit`,
    ),
  };
}

export function mapEventProgramsListPage(payload: unknown, context = "eventProgramsList") {
  const page = readEventProgramsPage(payload, context);

  return {
    ...page,
    items: page.items.map((item, index) =>
      mapEventProgramListItem(item, `${context}.data.items[${index}]`),
    ),
  };
}
