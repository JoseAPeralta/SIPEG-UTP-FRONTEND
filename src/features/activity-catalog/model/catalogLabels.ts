import type { ActivityStatus, ActivityType } from "@/types/domain";

export { eventProgramStatusLabels } from "@/features/event-programs/public";

export const activityTypeLabels: Record<ActivityType, string> = {
  COMPETITION: "Competencia",
  CONFERENCE: "Conferencia",
  COURSE: "Curso",
  OTHER: "Otro",
  PANEL: "Panel",
  SEMINAR: "Seminario",
  TALK: "Charla",
  WORKSHOP: "Taller",
};

export const activityStatusLabels: Record<ActivityStatus, string> = {
  CANCELLED: "Cancelada",
  COMPLETED: "Completada",
  DRAFT: "Borrador",
  ONGOING: "En curso",
  SCHEDULED: "Programada",
};

/** Campos de un programa de eventos que decide la etiqueta de su badge. */
export type ProgramBadgeSource = {
  isDefault: boolean;
  label: string | null;
  name: string;
};

/**
 * Etiqueta del badge de un programa de eventos.
 *
 * Los programas predeterminados los nombra el backend como
 * `Programa de Eventos - <unidad>`, que es un texto largo y repetido en toda la
 * agenda; se muestra en su lugar el nombre de la unidad. Los programas con
 * `label` propio lo respetan, y los demas usan su nombre.
 *
 * Acepta cualquier objeto con esa forma, de modo que la agenda publica
 * reutiliza la misma regla aunque no comparta tipo con el catalogo
 * administrativo.
 */
export function getProgramBadgeLabel(program: ProgramBadgeSource, unit: { name: string }): string {
  if (program.label) {
    return program.label;
  }

  return program.isDefault ? unit.name : program.name;
}
