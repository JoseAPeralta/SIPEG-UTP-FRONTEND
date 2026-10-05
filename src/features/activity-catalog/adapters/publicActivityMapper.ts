import type {
  ActivitySpeaker,
  ActivityType,
  OrganizationalUnitType,
  PublicActivity,
  PublicClassroom,
  PublicEventProgram,
  PublicOrganizationalUnit,
} from "@/types/domain";

export class PublicActivityMappingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PublicActivityMappingError";
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

const ORGANIZATIONAL_UNIT_TYPES: readonly OrganizationalUnitType[] = ["FACULTY", "SUBDIRECTORATE"];

function fail(context: string, detail: string): never {
  throw new PublicActivityMappingError(`${context}: ${detail}`);
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

function readNullableNumber(value: unknown, context: string): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value !== "number" || !Number.isFinite(value)) {
    fail(context, "se esperaba un numero o null");
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

function mapSpeaker(raw: unknown, context: string): ActivitySpeaker {
  const speaker = readObject(raw, context);

  return {
    firstName: readString(speaker["firstName"], `${context}.firstName`),
    id: readString(speaker["id"], `${context}.id`),
    lastName: readString(speaker["lastName"], `${context}.lastName`),
  };
}

function mapClassroom(raw: unknown, context: string): PublicClassroom | null {
  if (raw === null || raw === undefined) {
    return null;
  }

  const classroom = readObject(raw, context);

  return {
    building: readNullableString(classroom["building"], `${context}.building`),
    id: readString(classroom["id"], `${context}.id`),
    name: readString(classroom["name"], `${context}.name`),
  };
}

/**
 * Prefijos con los que el backend nombra los programas de eventos predeterminados.
 *
 * El listado publico expone `label` pero no `isDefault`, asi que la distincion se
 * recupera del nombre. Acepta las dos variantes que aparecen en los datos
 * (`Programa de Eventos - <unidad>` y `Programa de Eventos de <unidad>`) porque
 * la regla de negocio es el nombre de la unidad detras del prefijo, no la
 * puntuacion concreta.
 *
 * Es una convencion del backend, no un dato del contrato: si un programa
 * predeterminado llegara sin ninguno de los dos prefijos, el badge cae al
 * nombre de la unidad, que es justo lo que se queria mostrar.
 */
const DEFAULT_PROGRAM_NAME_PREFIXES = ["Programa de Eventos - ", "Programa de Eventos de "];

function isDefaultProgramName(name: string): boolean {
  return DEFAULT_PROGRAM_NAME_PREFIXES.some((prefix) => name.startsWith(prefix));
}

function mapProgram(raw: unknown, context: string): PublicEventProgram {
  const program = readObject(raw, context);
  const name = readString(program["name"], `${context}.name`);

  return {
    id: readString(program["id"], `${context}.id`),
    isDefault: isDefaultProgramName(name),
    label: readNullableString(program["label"], `${context}.label`),
    name,
  };
}

function mapUnit(raw: unknown, context: string): PublicOrganizationalUnit {
  const unit = readObject(raw, context);

  return {
    backendId: readString(unit["id"], `${context}.id`),
    name: readString(unit["name"], `${context}.name`),
    type: readEnum(unit["type"], ORGANIZATIONAL_UNIT_TYPES, `${context}.type`),
  };
}

/** Mapea un `ActivityListItem` del listado publico de actividades. */
export function mapPublicActivity(raw: unknown, context = "activity"): PublicActivity {
  const activity = readObject(raw, context);

  return {
    bannerUrl: readNullableString(activity["bannerUrl"], `${context}.bannerUrl`),
    capacity: readNullableNumber(activity["capacity"], `${context}.capacity`),
    classroom: mapClassroom(activity["classroom"], `${context}.classroom`),
    date: readString(activity["date"], `${context}.date`),
    description: readNullableString(activity["description"], `${context}.description`),
    endTime: readString(activity["endTime"], `${context}.endTime`),
    id: readString(activity["id"], `${context}.id`),
    name: readString(activity["name"], `${context}.name`),
    program: mapProgram(activity["eventProgram"], `${context}.eventProgram`),
    speakers: readArray(activity["speakers"], `${context}.speakers`).map((speaker, index) =>
      mapSpeaker(speaker, `${context}.speakers[${index}]`),
    ),
    startTime: readString(activity["startTime"], `${context}.startTime`),
    type: readEnum(activity["type"], ACTIVITY_TYPES, `${context}.type`),
    unit: mapUnit(activity["organizationalUnit"], `${context}.organizationalUnit`),
  };
}

export type MappedPublicActivityCatalog = {
  activities: PublicActivity[];
  total: number;
  totalPages: number;
};

/**
 * Mapea el listado publico paginado completo.
 *
 * El contrato limita `limit` a 50, asi que una agenda mayor exige varias
 * paginas. Se recorren todas antes de devolver el read model: el filtrado, el
 * orden y la paginacion de la agenda ocurren en el cliente sobre el conjunto
 * completo.
 */
export function mapPublicActivityCatalog(
  payload: unknown,
  context = "publicActivities",
): MappedPublicActivityCatalog {
  const data = readObject(readObject(payload, context)["data"], `${context}.data`);
  const activities = readArray(data["items"], `${context}.data.items`).map((item, index) =>
    mapPublicActivity(item, `${context}.data.items[${index}]`),
  );

  return {
    activities,
    total: readNumber(data["total"], `${context}.data.total`),
    totalPages: readNumber(data["totalPages"], `${context}.data.totalPages`),
  };
}

function readNumber(value: unknown, context: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    fail(context, "se esperaba un numero");
  }

  return value;
}
