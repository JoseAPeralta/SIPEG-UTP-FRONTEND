import type { OrganizationalUnitType } from "@/types/domain";

import type { DefaultEventProgram } from "./organizationalUnitDetail";

export const organizationalUnitTypeLabels: Record<OrganizationalUnitType, string> = {
  FACULTY: "Facultad",
  SUBDIRECTORATE: "Subdirección",
};

export const defaultProgramStatusLabels: Record<DefaultEventProgram["status"], string> = {
  ACTIVE: "Activo",
  ARCHIVED: "Archivado",
  CANCELLED: "Cancelado",
  COMPLETED: "Completado",
  DRAFT: "Borrador",
};
