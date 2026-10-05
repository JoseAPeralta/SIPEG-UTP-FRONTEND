import type { Classroom } from "@/types/domain";

/**
 * Ventana de disponibilidad semanal de un aula.
 *
 * `dayOfWeek` usa la numeracion ISO del contrato: `1` es lunes y `7` domingo. `period` es texto
 * libre del backend y no actua como regla adicional de disponibilidad: solo se muestra junto a la
 * hora cuando existe.
 */
export type ClassroomAvailability = {
  dayOfWeek: number;
  endTime: string;
  id: string;
  period: string | null;
  startTime: string;
};

/**
 * Aula con su disponibilidad semanal.
 *
 * Extiende `Classroom` a proposito: el resumen del catalogo publico y el detalle administrativo
 * comparten nombre, tipo, capacidad, ubicacion, estado y amenidades, y solo el detalle anade el
 * horario. El tipo vive en la feature porque `ActivityCatalog` solo necesita el resumen.
 */
export type ClassroomDetail = Classroom & {
  availability: ClassroomAvailability[];
};
