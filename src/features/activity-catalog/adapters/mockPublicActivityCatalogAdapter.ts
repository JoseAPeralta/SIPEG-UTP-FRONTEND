import type { PublicActivityCatalogAdapter } from "@/app/adapters/contracts";
import { mockActivityCatalog } from "@/data/mock";
import type { PublicActivity, PublicActivityCatalog } from "@/types/domain";

/**
 * Deriva la agenda publica desde el catalogo de demostracion.
 *
 * No se mantiene una segunda lista de actividades: el read model publico es un
 * subconjunto del administrativo, asi que se proyecta en lugar de duplicarse.
 * Solo se publican las actividades vigentes, que es lo que el listado publico del
 * API devuelve.
 */
export function createMockPublicActivityCatalogAdapter(): PublicActivityCatalogAdapter {
  return {
    loadPublicActivities: (): Promise<PublicActivityCatalog> => {
      const unitsById = new Map(
        mockActivityCatalog.organizationalUnits.map((unit) => [unit.id, unit]),
      );
      const programsById = new Map(
        mockActivityCatalog.eventPrograms.map((program) => [program.id, program]),
      );
      const classroomsById = new Map(
        mockActivityCatalog.classrooms.map((classroom) => [classroom.id, classroom]),
      );

      const activities: PublicActivity[] = mockActivityCatalog.activities
        .filter((activity) => activity.status === "SCHEDULED" || activity.status === "ONGOING")
        .flatMap((activity) => {
          const program = programsById.get(activity.eventProgramId);
          const unit = program ? unitsById.get(program.organizationalUnitId) : undefined;
          const classroom = activity.classroomId
            ? classroomsById.get(activity.classroomId)
            : undefined;

          if (!program || !unit) {
            return [];
          }

          return [
            {
              bannerUrl: activity.bannerUrl,
              capacity: activity.capacity,
              classroom: classroom
                ? { building: classroom.building, id: classroom.id, name: classroom.name }
                : null,
              date: activity.date,
              description: activity.description,
              endTime: activity.endTime,
              id: activity.id,
              name: activity.name,
              program: {
                id: program.id,
                isDefault: program.isDefault,
                label: program.label,
                name: program.name,
              },
              speakers: activity.speakers,
              startTime: activity.startTime,
              type: activity.type,
              unit: { backendId: unit.id, name: unit.name, type: unit.type },
            },
          ];
        });

      return Promise.resolve(structuredClone({ activities }));
    },
  };
}
