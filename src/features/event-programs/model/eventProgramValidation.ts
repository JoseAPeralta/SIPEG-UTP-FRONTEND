import type { CreateEventProgramRequest, UpdateEventProgramRequest } from "./eventProgramRequests";

export const EVENT_PROGRAM_DESCRIPTION_MAX_LENGTH = 2000;
export const EVENT_PROGRAM_LABEL_MAX_LENGTH = 100;
export const EVENT_PROGRAM_NAME_MAX_LENGTH = 200;

export type EventProgramFormValues = {
  description: string;
  endDate: string;
  label: string;
  name: string;
  organizationalUnitId: string;
  startDate: string;
};

export type EventProgramFormErrors = Partial<Record<keyof EventProgramFormValues, string>>;

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isRealDate(value: string): boolean {
  if (!DATE_PATTERN.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number) as [number, number, number];
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

export function validateEventProgramDraft(
  values: EventProgramFormValues,
  activeUnitIds: readonly string[],
): EventProgramFormErrors {
  const errors: EventProgramFormErrors = {};
  const name = values.name.trim();
  const description = values.description.trim();
  const label = values.label.trim();

  if (!name) errors.name = "Escriba el nombre del programa.";
  else if (name.length > EVENT_PROGRAM_NAME_MAX_LENGTH)
    errors.name = `Use ${EVENT_PROGRAM_NAME_MAX_LENGTH} caracteres o menos.`;
  if (description.length > EVENT_PROGRAM_DESCRIPTION_MAX_LENGTH)
    errors.description = `Use ${EVENT_PROGRAM_DESCRIPTION_MAX_LENGTH} caracteres o menos.`;
  if (label.length > EVENT_PROGRAM_LABEL_MAX_LENGTH)
    errors.label = `Use ${EVENT_PROGRAM_LABEL_MAX_LENGTH} caracteres o menos.`;
  if (!values.organizationalUnitId) errors.organizationalUnitId = "Seleccione una unidad.";
  else if (!activeUnitIds.includes(values.organizationalUnitId))
    errors.organizationalUnitId = "La unidad seleccionada ya no está activa.";
  if (!isRealDate(values.startDate)) errors.startDate = "Indique una fecha inicial válida.";
  if (!isRealDate(values.endDate)) errors.endDate = "Indique una fecha final válida.";
  if (!errors.startDate && !errors.endDate && values.endDate < values.startDate)
    errors.endDate = "La fecha final no puede ser anterior a la inicial.";

  return errors;
}

export function toCreateEventProgramRequest(
  values: EventProgramFormValues,
): CreateEventProgramRequest {
  return {
    description: values.description.trim() || null,
    endDate: values.endDate,
    label: values.label.trim() || null,
    name: values.name.trim(),
    organizationalUnitId: values.organizationalUnitId,
    startDate: values.startDate,
  };
}

/** Campos editables de un programa; la unidad propietaria y `isDefault` no se editan. */
export type EventProgramEditFormValues = {
  description: string;
  endDate: string;
  label: string;
  name: string;
  startDate: string;
};

export type EventProgramEditFormErrors = Partial<Record<keyof EventProgramEditFormValues, string>>;

/**
 * Valida la edicion de un programa. La agenda permanente no admite fechas: el contrato responde
 * `400` si las recibe, de modo que el formulario ni siquiera las presenta ni las valida.
 */
export function validateEventProgramUpdate(
  values: EventProgramEditFormValues,
  options: { isDefault: boolean },
): EventProgramEditFormErrors {
  const errors: EventProgramEditFormErrors = {};
  const name = values.name.trim();
  const description = values.description.trim();
  const label = values.label.trim();

  if (!name) errors.name = "Escriba el nombre del programa.";
  else if (name.length > EVENT_PROGRAM_NAME_MAX_LENGTH)
    errors.name = `Use ${EVENT_PROGRAM_NAME_MAX_LENGTH} caracteres o menos.`;
  if (description.length > EVENT_PROGRAM_DESCRIPTION_MAX_LENGTH)
    errors.description = `Use ${EVENT_PROGRAM_DESCRIPTION_MAX_LENGTH} caracteres o menos.`;
  if (label.length > EVENT_PROGRAM_LABEL_MAX_LENGTH)
    errors.label = `Use ${EVENT_PROGRAM_LABEL_MAX_LENGTH} caracteres o menos.`;

  if (!options.isDefault) {
    if (!isRealDate(values.startDate)) errors.startDate = "Indique una fecha inicial válida.";
    if (!isRealDate(values.endDate)) errors.endDate = "Indique una fecha final válida.";
    if (!errors.startDate && !errors.endDate && values.endDate < values.startDate)
      errors.endDate = "La fecha final no puede ser anterior a la inicial.";
  }

  return errors;
}

/** Allowlist del parche: la unidad, `isDefault` y el banner nunca viajan desde este formulario. */
export function toUpdateEventProgramRequest(
  values: EventProgramEditFormValues,
  options: { isDefault: boolean },
): UpdateEventProgramRequest {
  const request: UpdateEventProgramRequest = {
    description: values.description.trim() || null,
    label: values.label.trim() || null,
    name: values.name.trim(),
  };

  if (!options.isDefault) {
    request.endDate = values.endDate;
    request.startDate = values.startDate;
  }

  return request;
}
