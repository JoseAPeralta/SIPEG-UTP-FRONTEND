import type {
  ActivitySpeaker,
  ActivityStatus,
  ActivityType,
  OrganizationalUnitType,
} from "@/types/domain";

import type {
  AdministrativeActivityClassroom,
  AdministrativeActivityDetail,
  AdministrativeActivityListItem,
  AdministrativeActivityProgram,
  AdministrativeActivityUnit,
} from "../model/administrativeActivity";

export class ActivityAdministrationMappingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ActivityAdministrationMappingError";
  }
}

const ACTIVITY_TYPES: readonly ActivityType[] = [
  "COMPETITION",
  "CONFERENCE",
  "COURSE",
  "OTHER",
  "PANEL",
  "SEMINAR",
  "TALK",
  "WORKSHOP",
];
const ACTIVITY_STATUSES: readonly ActivityStatus[] = [
  "CANCELLED",
  "COMPLETED",
  "DRAFT",
  "ONGOING",
  "SCHEDULED",
];
const UNIT_TYPES: readonly OrganizationalUnitType[] = ["FACULTY", "SUBDIRECTORATE"];

function fail(context: string, detail: string): never {
  throw new ActivityAdministrationMappingError(`${context}: ${detail}`);
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
  if (typeof value !== "string") fail(context, "se esperaba un texto o null");

  return value;
}

function readInteger(value: unknown, context: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    fail(context, "se esperaba un entero no negativo");
  }

  return value;
}

function readNullableInteger(value: unknown, context: string): number | null {
  if (value === null) return null;
  return readInteger(value, context);
}

function readEnum<T extends string>(value: unknown, allowed: readonly T[], context: string): T {
  if (typeof value !== "string" || !allowed.includes(value as T)) {
    fail(context, `valor fuera del contrato: ${String(value)}`);
  }

  return value as T;
}

function readArray(value: unknown, context: string): unknown[] {
  if (!Array.isArray(value)) fail(context, "se esperaba una lista");

  return value;
}

function readStringList(value: unknown, context: string): string[] {
  return readArray(value, context).map((item, index) => readString(item, `${context}[${index}]`));
}

export function readActivityEnvelopeData(payload: unknown, context: string): unknown {
  const envelope = readObject(payload, context);
  if (envelope["success"] !== true) fail(`${context}.success`, "debe ser true");
  readString(envelope["message"], `${context}.message`);

  return envelope["data"];
}

function mapSpeaker(raw: unknown, context: string): ActivitySpeaker {
  const speaker = readObject(raw, context);

  return {
    firstName: readString(speaker["firstName"], `${context}.firstName`),
    id: readString(speaker["id"], `${context}.id`),
    lastName: readString(speaker["lastName"], `${context}.lastName`),
  };
}

function mapClassroom(raw: unknown, context: string): AdministrativeActivityClassroom {
  const classroom = readObject(raw, context);

  return {
    building: readNullableString(classroom["building"], `${context}.building`),
    id: readString(classroom["id"], `${context}.id`),
    name: readString(classroom["name"], `${context}.name`),
  };
}

function mapProgram(raw: unknown, context: string): AdministrativeActivityProgram {
  const program = readObject(raw, context);

  return {
    id: readString(program["id"], `${context}.id`),
    label: readNullableString(program["label"], `${context}.label`),
    name: readString(program["name"], `${context}.name`),
  };
}

function mapUnit(raw: unknown, context: string): AdministrativeActivityUnit {
  const unit = readObject(raw, context);

  return {
    id: readString(unit["id"], `${context}.id`),
    name: readString(unit["name"], `${context}.name`),
    type: readEnum(unit["type"], UNIT_TYPES, `${context}.type`),
  };
}

/** Campos que comparten la fila del listado y el detalle; el detalle anade contadores y equipo. */
function mapActivityFields(raw: unknown, context: string) {
  const activity = readObject(raw, context);
  const classroom = activity["classroom"];

  return {
    bannerUrl: readNullableString(activity["bannerUrl"], `${context}.bannerUrl`),
    capacity: readNullableInteger(activity["capacity"], `${context}.capacity`),
    classroom: classroom === null ? null : mapClassroom(classroom, `${context}.classroom`),
    date: readString(activity["date"], `${context}.date`),
    description: readNullableString(activity["description"], `${context}.description`),
    endTime: readString(activity["endTime"], `${context}.endTime`),
    eventProgram: mapProgram(activity["eventProgram"], `${context}.eventProgram`),
    id: readString(activity["id"], `${context}.id`),
    name: readString(activity["name"], `${context}.name`),
    organizationalUnit: mapUnit(activity["organizationalUnit"], `${context}.organizationalUnit`),
    speakers: readArray(activity["speakers"], `${context}.speakers`).map((speaker, index) =>
      mapSpeaker(speaker, `${context}.speakers[${index}]`),
    ),
    startTime: readString(activity["startTime"], `${context}.startTime`),
    status: readEnum(activity["status"], ACTIVITY_STATUSES, `${context}.status`),
    type: readEnum(activity["type"], ACTIVITY_TYPES, `${context}.type`),
  };
}

export function mapAdministrativeActivityListItem(
  raw: unknown,
  context = "activity",
): AdministrativeActivityListItem {
  return mapActivityFields(raw, context);
}

/** `ActivityDetail` agrega equipamiento, contadores y motivo de cancelacion que la fila omite. */
export function mapAdministrativeActivityDetail(
  raw: unknown,
  context = "activityDetail",
): AdministrativeActivityDetail {
  const activity = readObject(raw, context);

  return {
    ...mapActivityFields(activity, context),
    cancelReason: readNullableString(activity["cancelReason"], `${context}.cancelReason`),
    checkedInCount: readInteger(activity["checkedInCount"], `${context}.checkedInCount`),
    enrolledCount: readInteger(activity["enrolledCount"], `${context}.enrolledCount`),
    equipment: readStringList(activity["equipment"], `${context}.equipment`),
  };
}

export function mapActivitiesListPage(payload: unknown, context = "programActivities") {
  const data = readObject(readActivityEnvelopeData(payload, context), `${context}.data`);

  return {
    items: readArray(data["items"], `${context}.data.items`).map((item, index) =>
      mapAdministrativeActivityListItem(item, `${context}.data.items[${index}]`),
    ),
    limit: readInteger(data["limit"], `${context}.data.limit`),
    page: readInteger(data["page"], `${context}.data.page`),
    total: readInteger(data["total"], `${context}.data.total`),
    totalPages: readInteger(data["totalPages"], `${context}.data.totalPages`),
  };
}

/** Respuesta de creacion y edicion: el detalle viaja directamente en `data`, sin paginacion. */
export function mapActivityMutationResponse(
  payload: unknown,
  context = "activityMutation",
): AdministrativeActivityDetail {
  return mapAdministrativeActivityDetail(
    readActivityEnvelopeData(payload, context),
    `${context}.data`,
  );
}
