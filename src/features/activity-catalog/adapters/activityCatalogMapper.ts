import { toActivitySummary } from "../model/activitySummary";

import { mapActivitiesListPage } from "./administrativeActivityMapper";

/**
 * Una pagina del listado de actividades de un programa, ya proyectada al resumen que consumen el
 * catalogo, las tarjetas y los selectores.
 *
 * Reutiliza el mapper administrativo porque `EventProgramActivityItem` es el mismo schema que
 * valida la pantalla de listado; anade las referencias planas (`classroomId` y `eventProgramId`)
 * que el resumen usa para resolver aula y programa desde sus propias colecciones. Los campos de
 * detalle que un payload pudiera inyectar se descartan en la proyeccion.
 */
export function readCatalogActivitiesPage(payload: unknown, context = "activityCatalog") {
  const page = mapActivitiesListPage(payload, context);

  return {
    items: page.items.map((item) =>
      toActivitySummary({
        ...item,
        classroomId: item.classroom?.id ?? null,
        eventProgramId: item.eventProgram.id,
      }),
    ),
    totalPages: page.totalPages,
  };
}
