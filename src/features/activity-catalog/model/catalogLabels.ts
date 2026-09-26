import type { ActivityStatus, EventProgramStatus } from "@/types/domain";

export const activityStatusLabels: Record<ActivityStatus, string> = {
  CANCELLED: "Cancelada",
  COMPLETED: "Completada",
  DRAFT: "Borrador",
  ONGOING: "En curso",
  SCHEDULED: "Programada",
};

export const eventProgramStatusLabels: Record<EventProgramStatus, string> = {
  ACTIVE: "Activo",
  ARCHIVED: "Archivado",
  CANCELLED: "Cancelado",
  COMPLETED: "Completado",
  DRAFT: "Borrador",
};
