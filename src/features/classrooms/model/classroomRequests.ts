import type { ClassroomType } from "@/types/domain";

/**
 * Cuerpo de creacion. `isActive` no se ofrece: el alta de un aula es siempre activa y el cambio
 * de estado documentado es `PATCH`, igual que en las unidades de la Fase 2.2.
 */
export type CreateClassroomRequest = {
  building: string | null;
  capacity: number;
  floor: number | null;
  name: string;
  type: ClassroomType;
};

export type UpdateClassroomRequest = Partial<CreateClassroomRequest> & {
  isActive?: boolean;
};

/** Ventana semanal a agregar. `period` acepta `null` porque el contrato lo hace opcional. */
export type AddClassroomAvailabilityRequest = {
  dayOfWeek: number;
  endTime: string;
  period: string | null;
  startTime: string;
};
