import type { ActivityType } from "@/types/domain";

import type { AdministrativeActivityDetail } from "./administrativeActivity";
import type {
  ActivitySpeakerInput,
  CreateActivityRequest,
  UpdateActivityRequest,
} from "./activityRequests";

export const ACTIVITY_BANNER_MAX_LENGTH = 500;
export const ACTIVITY_CAPACITY_MAX = 100000;
export const ACTIVITY_DESCRIPTION_MAX_LENGTH = 2000;
export const ACTIVITY_EQUIPMENT_ITEMS_MAX = 20;
export const ACTIVITY_EQUIPMENT_ITEM_MAX_LENGTH = 255;
export const ACTIVITY_NAME_MAX_LENGTH = 200;
export const ACTIVITY_SPEAKER_EMAIL_MAX_LENGTH = 254;
export const ACTIVITY_SPEAKER_NAME_MAX_LENGTH = 100;
export const ACTIVITY_SPEAKER_ORGANIZATION_MAX_LENGTH = 150;
export const ACTIVITY_SPEAKERS_MAX_ITEMS = 10;

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export type ActivitySpeakerFormValue = {
  email: string;
  firstName: string;
  lastName: string;
  organization: string;
};

export type ActivityFormValues = {
  bannerUrl: string;
  capacity: string;
  classroomId: string;
  date: string;
  description: string;
  endTime: string;
  equipment: string;
  name: string;
  speakers: ActivitySpeakerFormValue[];
  startTime: string;
  type: ActivityType | "";
};

export type ActivitySpeakerFormErrors = Partial<Record<keyof ActivitySpeakerFormValue, string>>;

export type ActivityFormErrors = {
  bannerUrl?: string;
  capacity?: string;
  date?: string;
  description?: string;
  endTime?: string;
  equipment?: string;
  name?: string;
  speakers?: (ActivitySpeakerFormErrors | undefined)[];
  speakersLimit?: string;
  startTime?: string;
  type?: string;
};

export const EMPTY_ACTIVITY_FORM_VALUES: ActivityFormValues = {
  bannerUrl: "",
  capacity: "",
  classroomId: "",
  date: "",
  description: "",
  endTime: "",
  equipment: "",
  name: "",
  speakers: [],
  startTime: "",
  type: "",
};

function isRealDate(value: string): boolean {
  if (!DATE_PATTERN.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number) as [number, number, number];
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

/** Cada linea no vacia es un elemento de `equipment`; el contrato admite hasta 20. */
export function parseEquipmentLines(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

export function formatEquipmentLines(equipment: readonly string[]): string {
  return equipment.join("\n");
}

function validateEquipment(text: string): string | undefined {
  const items = parseEquipmentLines(text);
  if (items.length > ACTIVITY_EQUIPMENT_ITEMS_MAX) {
    return `Use ${ACTIVITY_EQUIPMENT_ITEMS_MAX} elementos o menos.`;
  }
  if (items.some((item) => item.length > ACTIVITY_EQUIPMENT_ITEM_MAX_LENGTH)) {
    return `Cada elemento puede tener hasta ${ACTIVITY_EQUIPMENT_ITEM_MAX_LENGTH} caracteres.`;
  }

  return undefined;
}

function parseCapacity(text: string): { error?: string; value?: number } {
  const trimmed = text.trim();
  if (!trimmed) return {};

  const value = Number(trimmed);
  if (!Number.isInteger(value) || value <= 0 || value > ACTIVITY_CAPACITY_MAX) {
    return { error: `Indique una capacidad entre 1 y ${ACTIVITY_CAPACITY_MAX}.` };
  }

  return { value };
}

/** Capacidad valida o `undefined`; la usan los criterios de disponibilidad del formulario. */
export function parseCapacityValue(text: string): number | undefined {
  return parseCapacity(text).value;
}

function validateSpeaker(speaker: ActivitySpeakerFormValue): ActivitySpeakerFormErrors | undefined {
  const errors: ActivitySpeakerFormErrors = {};
  const firstName = speaker.firstName.trim();
  const lastName = speaker.lastName.trim();
  const email = speaker.email.trim();
  const organization = speaker.organization.trim();

  if (!firstName) errors.firstName = "Escriba el nombre.";
  else if (firstName.length > ACTIVITY_SPEAKER_NAME_MAX_LENGTH)
    errors.firstName = `Use ${ACTIVITY_SPEAKER_NAME_MAX_LENGTH} caracteres o menos.`;
  if (!lastName) errors.lastName = "Escriba el apellido.";
  else if (lastName.length > ACTIVITY_SPEAKER_NAME_MAX_LENGTH)
    errors.lastName = `Use ${ACTIVITY_SPEAKER_NAME_MAX_LENGTH} caracteres o menos.`;
  if (email) {
    if (email.length > ACTIVITY_SPEAKER_EMAIL_MAX_LENGTH || !EMAIL_PATTERN.test(email)) {
      errors.email = "Indique un correo válido.";
    }
  }
  if (organization.length > ACTIVITY_SPEAKER_ORGANIZATION_MAX_LENGTH) {
    errors.organization = `Use ${ACTIVITY_SPEAKER_ORGANIZATION_MAX_LENGTH} caracteres o menos.`;
  }

  return Object.keys(errors).length > 0 ? errors : undefined;
}

/**
 * Valida los valores del formulario.
 *
 * `originalBannerUrl` permite omitir la validacion de un banner heredado que la persona no toco:
 * el parche de edicion no lo envia, de modo que un valor legado que no cumpla `format: uri` no
 * puede bloquear la edicion de otros campos.
 */
export function validateActivityValues(
  values: ActivityFormValues,
  options: { originalBannerUrl?: string } = {},
): ActivityFormErrors {
  const errors: ActivityFormErrors = {};
  const name = values.name.trim();
  const description = values.description.trim();
  const bannerUrl = values.bannerUrl.trim();

  if (!name) errors.name = "Escriba el nombre de la actividad.";
  else if (name.length > ACTIVITY_NAME_MAX_LENGTH)
    errors.name = `Use ${ACTIVITY_NAME_MAX_LENGTH} caracteres o menos.`;
  if (!values.type) errors.type = "Seleccione el tipo de actividad.";
  if (description.length > ACTIVITY_DESCRIPTION_MAX_LENGTH)
    errors.description = `Use ${ACTIVITY_DESCRIPTION_MAX_LENGTH} caracteres o menos.`;
  if (!isRealDate(values.date)) errors.date = "Indique una fecha válida.";
  if (!TIME_PATTERN.test(values.startTime)) errors.startTime = "Indique una hora de inicio válida.";
  if (!TIME_PATTERN.test(values.endTime)) errors.endTime = "Indique una hora de fin válida.";
  if (
    !errors.startTime &&
    !errors.endTime &&
    values.startTime.length > 0 &&
    values.endTime.length > 0 &&
    values.startTime >= values.endTime
  ) {
    errors.endTime = "La hora de fin debe ser posterior a la de inicio.";
  }

  const capacity = parseCapacity(values.capacity);
  if (capacity.error) errors.capacity = capacity.error;
  const bannerUnchanged =
    options.originalBannerUrl !== undefined && bannerUrl === options.originalBannerUrl;
  if (bannerUrl && !bannerUnchanged) {
    if (bannerUrl.length > ACTIVITY_BANNER_MAX_LENGTH) {
      errors.bannerUrl = `Use ${ACTIVITY_BANNER_MAX_LENGTH} caracteres o menos.`;
    } else {
      try {
        new URL(bannerUrl);
      } catch {
        errors.bannerUrl = "Indique una URL válida, por ejemplo https://ejemplo.com/banner.png.";
      }
    }
  }

  const equipmentError = validateEquipment(values.equipment);
  if (equipmentError) errors.equipment = equipmentError;

  if (values.speakers.length > ACTIVITY_SPEAKERS_MAX_ITEMS) {
    errors.speakersLimit = `Use ${ACTIVITY_SPEAKERS_MAX_ITEMS} ponentes o menos.`;
  }
  const speakerErrors = values.speakers.map(validateSpeaker);
  if (speakerErrors.some((entry) => entry !== undefined)) {
    errors.speakers = speakerErrors;
  }

  return errors;
}

function toSpeakerInputs(speakers: readonly ActivitySpeakerFormValue[]): ActivitySpeakerInput[] {
  return speakers.map((speaker) => ({
    email: speaker.email.trim() || null,
    firstName: speaker.firstName.trim(),
    lastName: speaker.lastName.trim(),
    organization: speaker.organization.trim() || null,
  }));
}

export function toCreateActivityRequest(
  values: ActivityFormValues,
  options: { eventProgramId: string },
): CreateActivityRequest {
  const request: CreateActivityRequest = {
    date: values.date.trim(),
    endTime: values.endTime.trim(),
    eventProgramId: options.eventProgramId,
    name: values.name.trim(),
    startTime: values.startTime.trim(),
    type: values.type as ActivityType,
  };
  const description = values.description.trim();
  const bannerUrl = values.bannerUrl.trim();
  const capacity = parseCapacity(values.capacity);
  const equipment = parseEquipmentLines(values.equipment);
  const speakers = toSpeakerInputs(values.speakers);

  request.description = description || null;
  if (bannerUrl) request.bannerUrl = bannerUrl;
  if (capacity.value !== undefined) request.maxCapacity = capacity.value;
  if (equipment.length > 0) request.equipment = equipment;
  if (speakers.length > 0) request.speakers = speakers;
  if (values.classroomId) request.classroomId = values.classroomId;

  return request;
}

/**
 * Construye un parche con los campos realmente modificados.
 *
 * Los ponentes viajan solo cuando la persona los edito (`speakersDirty`): el detalle del contrato
 * no devuelve su correo ni su organizacion, de modo que reenviarlos sin cambios perderia datos que
 * el formulario no puede reconstruir.
 */
export function toUpdateActivityRequest(
  values: ActivityFormValues,
  options: { original: AdministrativeActivityDetail; speakersDirty: boolean },
): UpdateActivityRequest {
  const { original } = options;
  const request: UpdateActivityRequest = {};
  const name = values.name.trim();
  const description = values.description.trim();
  const bannerUrl = values.bannerUrl.trim();
  const capacity = parseCapacity(values.capacity);
  const equipment = parseEquipmentLines(values.equipment);
  const nextCapacity = capacity.value ?? null;

  if (name !== original.name) request.name = name;
  if (values.type && values.type !== original.type) request.type = values.type;
  if (description !== (original.description ?? "")) request.description = description || null;
  if (values.date.trim() !== original.date) request.date = values.date.trim();
  if (values.startTime.trim() !== original.startTime) request.startTime = values.startTime.trim();
  if (values.endTime.trim() !== original.endTime) request.endTime = values.endTime.trim();
  if (nextCapacity !== original.capacity) request.maxCapacity = nextCapacity;
  if (bannerUrl !== (original.bannerUrl ?? "")) request.bannerUrl = bannerUrl || null;
  if (equipment.join("\n") !== original.equipment.join("\n")) request.equipment = equipment;
  if (values.classroomId !== (original.classroom?.id ?? "")) {
    request.classroomId = values.classroomId || null;
  }
  if (options.speakersDirty) request.speakers = toSpeakerInputs(values.speakers);

  return request;
}

/** Precarga el formulario de edicion con los valores que el detalle devuelve. */
export function activityFormValuesFromDetail(
  detail: AdministrativeActivityDetail,
): ActivityFormValues {
  return {
    bannerUrl: detail.bannerUrl ?? "",
    capacity: detail.capacity === null ? "" : String(detail.capacity),
    classroomId: detail.classroom?.id ?? "",
    date: detail.date,
    description: detail.description ?? "",
    endTime: detail.endTime,
    equipment: formatEquipmentLines(detail.equipment),
    name: detail.name,
    speakers: detail.speakers.map((speaker) => ({
      email: "",
      firstName: speaker.firstName,
      lastName: speaker.lastName,
      organization: "",
    })),
    startTime: detail.startTime,
    type: detail.type,
  };
}

export function hasActivityFormErrors(errors: ActivityFormErrors): boolean {
  const entries = Object.values(errors) as (
    string | (ActivitySpeakerFormErrors | undefined)[] | undefined
  )[];

  return entries.some((entry) =>
    Array.isArray(entry)
      ? entry.some((speakerError) => speakerError !== undefined)
      : Boolean(entry),
  );
}
