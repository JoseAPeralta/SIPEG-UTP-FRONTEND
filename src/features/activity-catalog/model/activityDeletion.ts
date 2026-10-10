import type { ActivityStatus, EventProgramStatus } from "@/types/domain";

export type ActivityDeletionContext = {
  activityStatus: ActivityStatus;
  hasDeletePermission: boolean;
  programStatus: EventProgramStatus | null;
};

/**
 * Disponibilidad local de "Eliminar borrador".
 *
 * Solo resuelve el permiso efectivo, el estado de la actividad y el del programa. El backend sigue
 * siendo la autoridad de retencion: tener contadores en cero no demuestra la ausencia de historial,
 * de modo que la vista no debe certificarla. La UI bloquea ademas durante consultas pendientes o
 * fallidas, porque `hasDeletePermission` o `programStatus` sin resolver no habilitan nada.
 */
export function canOfferActivityDeletion({
  activityStatus,
  hasDeletePermission,
  programStatus,
}: ActivityDeletionContext): boolean {
  return hasDeletePermission && activityStatus === "DRAFT" && programStatus === "ACTIVE";
}
