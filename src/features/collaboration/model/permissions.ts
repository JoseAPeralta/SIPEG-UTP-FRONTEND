/**
 * Modelo canonico de roles y permisos de colaboracion.
 *
 * Los codigos provienen de OpenAPI y solo circulan por dentro del frontend: la
 * capa de presentacion consume `*Labels` o los resolutores, nunca un valor
 * crudo. El backend sigue siendo la autoridad de autorizacion; este modulo no
 * infiere capacidades ni duplica los permisos predeterminados de cada rol,
 * porque el contrato no los publica.
 */

export const COLLABORATION_ROLES = ["VIEWER", "EDITOR", "ORGANIZER"] as const;

export type CollaborationRole = (typeof COLLABORATION_ROLES)[number];

export const PERMISSION_NAMES = [
  "program:read",
  "program:create",
  "program:update",
  "program:archive",
  "program:reactivate",
  "activity:read",
  "activity:create",
  "activity:update",
  "activity:cancel",
  "activity:delete",
  "attendance:register",
  "attendance:checkin",
  "attendance:manage",
  "certificate:read",
  "certificate:generate",
  "proposal:read",
  "proposal:review",
  "proposal:feedback",
  "report:view",
  "report:export",
  "permission:grant",
] as const;

export type PermissionName = (typeof PERMISSION_NAMES)[number];

export const collaborationRoleLabels: Record<CollaborationRole, string> = {
  EDITOR: "Editor",
  ORGANIZER: "Organizador",
  VIEWER: "Visualizador",
};

export const permissionLabels: Record<PermissionName, string> = {
  "activity:cancel": "Cancelar actividades",
  "activity:create": "Crear actividades",
  "activity:delete": "Eliminar actividades en borrador sin registros",
  "activity:read": "Ver actividades",
  "activity:update": "Actualizar actividades",
  "attendance:checkin": "Registrar check-in de asistentes",
  "attendance:manage": "Gestionar la lista de asistencia",
  "attendance:register": "Inscribir asistentes en una actividad",
  "certificate:generate": "Generar certificados",
  "certificate:read": "Consultar certificados",
  "permission:grant": "Otorgar y revocar permisos y colaboradores",
  "program:archive": "Archivar programas de eventos",
  "program:create": "Crear programas de eventos adicionales",
  "program:reactivate": "Reactivar programas de eventos archivados",
  "program:read": "Ver programas de eventos",
  "program:update": "Actualizar programas de eventos",
  "proposal:feedback": "Dar feedback a propuestas",
  "proposal:read": "Ver propuestas de ponentes",
  "proposal:review": "Revisar y responder propuestas",
  "report:export": "Exportar reportes",
  "report:view": "Ver reportes y estadísticas",
};

export const UNKNOWN_COLLABORATION_ROLE_LABEL = "Rol de colaboración no reconocido";
export const UNKNOWN_PERMISSION_LABEL = "Permiso no reconocido";

export function isCollaborationRole(value: unknown): value is CollaborationRole {
  return typeof value === "string" && (COLLABORATION_ROLES as readonly string[]).includes(value);
}

export function isPermissionName(value: unknown): value is PermissionName {
  return typeof value === "string" && (PERMISSION_NAMES as readonly string[]).includes(value);
}

export function resolveCollaborationRoleLabel(value: unknown): string {
  return isCollaborationRole(value)
    ? collaborationRoleLabels[value]
    : UNKNOWN_COLLABORATION_ROLE_LABEL;
}

export function resolvePermissionLabel(value: unknown): string {
  return isPermissionName(value) ? permissionLabels[value] : UNKNOWN_PERMISSION_LABEL;
}
