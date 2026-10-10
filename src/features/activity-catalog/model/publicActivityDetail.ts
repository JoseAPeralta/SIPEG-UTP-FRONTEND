import type { ActivityStatus, PublicActivity } from "@/types/domain";

/**
 * Detalle publico de una actividad (`ActivityDetail`).
 *
 * Extiende el resumen con el motivo de cancelacion y los inscritos, y excluye
 * `DRAFT` del estado: la frontera publica nunca expone un borrador. El mapper
 * valida `equipment` y `checkedInCount` para detectar drift del contrato, pero
 * ninguno de los dos forma parte del read model.
 */
export type PublicActivityDetail = Omit<PublicActivity, "status"> & {
  readonly cancelReason: string | null;
  readonly enrolledCount: number;
  readonly status: Exclude<ActivityStatus, "DRAFT">;
};
