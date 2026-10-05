import type {
  Activity,
  ActivitySpeaker,
  ActivityStatus,
  ActivityType,
  EventProgram,
  EventProgramStatus,
} from "@/types/domain";

export class ActivityCatalogMappingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ActivityCatalogMappingError";
  }
}

const EVENT_PROGRAM_STATUSES: readonly EventProgramStatus[] = [
  "ACTIVE",
  "ARCHIVED",
  "CANCELLED",
  "COMPLETED",
  "DRAFT",
];
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

function fail(context: string, detail: string): never {
  throw new ActivityCatalogMappingError(`${context}: ${detail}`);
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
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value !== "string") {
    fail(context, "se esperaba un texto o null");
  }

  return value;
}

function readNumber(value: unknown, context: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    fail(context, "se esperaba un numero");
  }

  return value;
}

function readNullableNumber(value: unknown, context: string): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value !== "number" || !Number.isFinite(value)) {
    fail(context, "se esperaba un numero o null");
  }

  return value;
}

function readBoolean(value: unknown, context: string): boolean {
  if (typeof value !== "boolean") {
    fail(context, "se esperaba un booleano");
  }

  return value;
}

function readArray(value: unknown, context: string): unknown[] {
  if (!Array.isArray(value)) {
    fail(context, "se esperaba una lista");
  }

  return value;
}

function readEnum<T extends string>(value: unknown, allowed: readonly T[], context: string): T {
  if (typeof value !== "string" || !allowed.includes(value as T)) {
    fail(context, `valor fuera del contrato: ${String(value)}`);
  }

  return value as T;
}

function readStringList(value: unknown, context: string): string[] {
  return readArray(value, context).map((item, index) => readString(item, `${context}[${index}]`));
}

export function readEnvelopeData(payload: unknown, context: string): unknown {
  const envelope = readObject(payload, context);

  return envelope["data"];
}

export function readPaginatedPage(payload: unknown, context: string) {
  const data = readObject(readEnvelopeData(payload, context), `${context}.data`);

  return {
    items: readArray(data["items"], `${context}.data.items`),
    totalPages: readNumber(data["totalPages"], `${context}.data.totalPages`),
  };
}

export function mapActivityId(raw: unknown, context = "activity"): string {
  const activity = readObject(raw, context);

  return readString(activity["id"], `${context}.id`);
}

export function mapEventProgram(raw: unknown, context = "eventProgram"): EventProgram {
  const program = readObject(raw, context);
  const unit = readObject(program["organizationalUnit"], `${context}.organizationalUnit`);

  return {
    bannerUrl: readNullableString(program["bannerUrl"], `${context}.bannerUrl`),
    description: readNullableString(program["description"], `${context}.description`),
    endDate: readNullableString(program["endDate"], `${context}.endDate`),
    id: readString(program["id"], `${context}.id`),
    isDefault: readBoolean(program["isDefault"], `${context}.isDefault`),
    label: readNullableString(program["label"], `${context}.label`),
    name: readString(program["name"], `${context}.name`),
    organizationalUnitId: readString(unit["id"], `${context}.organizationalUnit.id`),
    startDate: readNullableString(program["startDate"], `${context}.startDate`),
    status: readEnum(program["status"], EVENT_PROGRAM_STATUSES, `${context}.status`),
  };
}

function mapSpeaker(raw: unknown, context: string): ActivitySpeaker {
  const speaker = readObject(raw, context);

  return {
    firstName: readString(speaker["firstName"], `${context}.firstName`),
    id: readString(speaker["id"], `${context}.id`),
    lastName: readString(speaker["lastName"], `${context}.lastName`),
  };
}

export function mapActivity(raw: unknown, context = "activity"): Activity {
  const activity = readObject(raw, context);
  const program = readObject(activity["eventProgram"], `${context}.eventProgram`);
  const classroom = activity["classroom"];

  return {
    bannerUrl: readNullableString(activity["bannerUrl"], `${context}.bannerUrl`),
    cancelReason: readNullableString(activity["cancelReason"], `${context}.cancelReason`),
    capacity: readNullableNumber(activity["capacity"], `${context}.capacity`),
    checkedInCount: readNumber(activity["checkedInCount"], `${context}.checkedInCount`),
    classroomId: classroom
      ? readString(readObject(classroom, `${context}.classroom`)["id"], `${context}.classroom.id`)
      : null,
    date: readString(activity["date"], `${context}.date`),
    description: readNullableString(activity["description"], `${context}.description`),
    endTime: readString(activity["endTime"], `${context}.endTime`),
    enrolledCount: readNumber(activity["enrolledCount"], `${context}.enrolledCount`),
    equipment: readStringList(activity["equipment"], `${context}.equipment`),
    eventProgramId: readString(program["id"], `${context}.eventProgram.id`),
    id: readString(activity["id"], `${context}.id`),
    name: readString(activity["name"], `${context}.name`),
    speakers: readArray(activity["speakers"], `${context}.speakers`).map((speaker, index) =>
      mapSpeaker(speaker, `${context}.speakers[${index}]`),
    ),
    startTime: readString(activity["startTime"], `${context}.startTime`),
    status: readEnum(activity["status"], ACTIVITY_STATUSES, `${context}.status`),
    type: readEnum(activity["type"], ACTIVITY_TYPES, `${context}.type`),
  };
}
