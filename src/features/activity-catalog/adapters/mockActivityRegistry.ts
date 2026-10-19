import { activities } from "@/data/mock/activities";
import type { Activity } from "@/types/domain";

/**
 * Registro mutable por composicion.
 *
 * Compartirlo permite que el listado, el detalle y la disponibilidad de aulas lean el ciclo de vida
 * vivo: una actividad creada o editada en el panel se refleja sin duplicar fixtures.
 */
export type MockActivityRegistry = Map<string, Activity>;

export function createMockActivityRegistry(): MockActivityRegistry {
  return new Map(structuredClone(activities).map((activity) => [activity.id, activity]));
}
