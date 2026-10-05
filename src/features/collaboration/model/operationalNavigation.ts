import type { CollaborationScope } from "./ownPermissions";
import type { UserScopeStatus } from "./userScopes";

export const operationalScopePath = (scope: CollaborationScope) =>
  `/operaciones/${scope.type === "program" ? "programas" : "actividades"}/${encodeURIComponent(scope.id)}`;
export const scopeStatusLabels: Record<UserScopeStatus, string> = {
  DRAFT: "Borrador",
  ACTIVE: "Activo",
  COMPLETED: "Completado",
  CANCELLED: "Cancelado",
  ARCHIVED: "Archivado",
  SCHEDULED: "Programado",
  ONGOING: "En curso",
};
