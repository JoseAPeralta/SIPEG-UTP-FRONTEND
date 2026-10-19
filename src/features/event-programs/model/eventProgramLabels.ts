import type { EventProgramStatus } from "@/types/domain";

export const eventProgramStatusLabels: Record<EventProgramStatus, string> = {
  ACTIVE: "Activo",
  ARCHIVED: "Archivado",
  CANCELLED: "Cancelado",
  COMPLETED: "Completado",
  DRAFT: "Borrador",
};
