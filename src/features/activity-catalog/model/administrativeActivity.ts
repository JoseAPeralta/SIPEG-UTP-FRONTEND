import type {
  ActivitySpeaker,
  ActivityStatus,
  ActivityType,
  OrganizationalUnitType,
} from "@/types/domain";

/** Todo estado del contrato mas el comodin que el backend documenta para listar sin filtrar. */
export type ActivityStatusFilter = ActivityStatus | "ALL";

export type ActivityListFilters = {
  dateFrom?: string;
  dateTo?: string;
  q?: string;
  status?: ActivityStatusFilter;
  type?: ActivityType;
};

export type AdministrativeActivityClassroom = {
  building: string | null;
  id: string;
  name: string;
};

export type AdministrativeActivityProgram = {
  id: string;
  label: string | null;
  name: string;
};

export type AdministrativeActivityUnit = {
  id: string;
  name: string;
  type: OrganizationalUnitType;
};

/**
 * Fila administrativa (`EventProgramActivityItem`).
 *
 * No extiende `Activity` a proposito: el listado por programa omite `equipment`,
 * `enrolledCount`, `checkedInCount` y `cancelReason`, que solo existen en el detalle. Modelarlos
 * como dos tipos impide que la pantalla de listado dependa de un dato que el contrato no le da.
 */
export type AdministrativeActivityListItem = {
  bannerUrl: string | null;
  capacity: number | null;
  classroom: AdministrativeActivityClassroom | null;
  date: string;
  description: string | null;
  endTime: string;
  eventProgram: AdministrativeActivityProgram;
  id: string;
  name: string;
  organizationalUnit: AdministrativeActivityUnit;
  speakers: ActivitySpeaker[];
  startTime: string;
  status: ActivityStatus;
  type: ActivityType;
};

/** Detalle (`ActivityDetail`): anade equipamiento, contadores y motivo de cancelacion. */
export type AdministrativeActivityDetail = AdministrativeActivityListItem & {
  cancelReason: string | null;
  checkedInCount: number;
  enrolledCount: number;
  equipment: string[];
};

export type AdministrativeActivityListPage = {
  items: AdministrativeActivityListItem[];
  limit: number;
  page: number;
  total: number;
  totalPages: number;
};

/** Orden de presentacion de los tipos de actividad en formularios y filtros. */
export const ACTIVITY_TYPE_ORDER: readonly ActivityType[] = [
  "WORKSHOP",
  "SEMINAR",
  "TALK",
  "CONFERENCE",
  "PANEL",
  "COURSE",
  "COMPETITION",
  "OTHER",
];

/**
 * El contrato solo admite editar actividades en `DRAFT` o `SCHEDULED`: `ONGOING`, `COMPLETED` y
 * `CANCELLED` responden `409`. `status` es el estado efectivo derivado por el backend.
 */
export function isActivityEditable(status: ActivityStatus): boolean {
  return status === "DRAFT" || status === "SCHEDULED";
}
