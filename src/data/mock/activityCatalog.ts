import type { ActivityCatalog } from "@/types/domain";

import { activities } from "./activities";
import { classrooms } from "./classrooms";
import { eventPrograms } from "./eventPrograms";
import { organizationalUnits } from "./organizationalUnits";

/**
 * Agregado mock de demostracion.
 *
 * `satisfies` conserva el tipo literal completo de cada coleccion: el registro de actividades
 * mantiene `Activity` para que los adapters que verifican reservas, permisos o detalles lean el
 * dato completo, mientras que el catalogo expuesto lo proyecta al resumen del listado.
 */
export const mockActivityCatalog = {
  activities,
  classrooms,
  eventPrograms,
  organizationalUnits,
} satisfies ActivityCatalog;
