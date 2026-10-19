import type { ActivityType } from "@/types/domain";

/**
 * Ponente inline que aceptan las operaciones de creacion y edicion de actividades.
 *
 * El detalle de una actividad devuelve solo `id`, `firstName` y `lastName`: el correo y la
 * organizacion no vuelven del backend, de modo que enviar `speakers` reemplaza la lista y es una
 * accion explicita del formulario.
 */
export type ActivitySpeakerInput = {
  email?: string | null;
  firstName: string;
  lastName: string;
  organization?: string | null;
};

export type CancelActivityRequest = {
  reason?: string;
};

export type CreateActivityRequest = {
  bannerUrl?: string | null;
  classroomId?: string | null;
  date: string;
  description?: string | null;
  endTime: string;
  equipment?: string[];
  eventProgramId: string;
  maxCapacity?: number;
  name: string;
  speakers?: ActivitySpeakerInput[];
  startTime: string;
  type: ActivityType;
};

/**
 * Parche parcial de la edicion.
 *
 * El programa propietario es inmutable y nunca viaja. `status` solo admite `DRAFT` o `SCHEDULED`
 * (la publicacion se integra en 5.6); el adapter reconstruye el cuerpo con una allowlist.
 */
export type UpdateActivityRequest = {
  bannerUrl?: string | null;
  classroomId?: string | null;
  date?: string;
  description?: string | null;
  endTime?: string;
  equipment?: string[];
  maxCapacity?: number | null;
  name?: string;
  speakers?: ActivitySpeakerInput[];
  startTime?: string;
  status?: "DRAFT" | "SCHEDULED";
  type?: ActivityType;
};
