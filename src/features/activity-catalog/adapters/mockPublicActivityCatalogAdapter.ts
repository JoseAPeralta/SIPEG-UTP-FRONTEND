import type { PublicActivityCatalogAdapter } from "@/app/adapters/contracts";
import { mockActivityCatalog } from "@/data/mock/activityCatalog";
import type {
  Activity,
  ActivityStatus,
  EventProgram,
  OrganizationalUnit,
  PublicActivity,
  PublicActivityCatalog,
  PublicActivityStatus,
  PublicClassroom,
} from "@/types/domain";

import type { PublicActivityDetail } from "../model/publicActivityDetail";

const PUBLIC_ACTIVITY_STATUSES: readonly PublicActivityStatus[] = [
  "SCHEDULED",
  "ONGOING",
  "COMPLETED",
];

/** El detalle tambien publica canceladas; nunca borradores. */
const PUBLIC_DETAIL_STATUSES: readonly Exclude<ActivityStatus, "DRAFT">[] = [
  ...PUBLIC_ACTIVITY_STATUSES,
  "CANCELLED",
];

function isPublicActivity(
  activity: Activity,
): activity is Activity & { status: PublicActivityStatus } {
  return (PUBLIC_ACTIVITY_STATUSES as readonly Activity["status"][]).includes(activity.status);
}

function isPublicDetail(
  activity: Activity,
): activity is Activity & { status: Exclude<ActivityStatus, "DRAFT"> } {
  return (PUBLIC_DETAIL_STATUSES as readonly Activity["status"][]).includes(activity.status);
}

type PublicActivityReferences = {
  classroom: PublicClassroom | null;
  program: EventProgram;
  unit: OrganizationalUnit;
};

/**
 * Resuelve programa, unidad y aula desde el catalogo de demostracion.
 *
 * La agenda publica solo publica programas activos, asi que un programa ausente
 * o no activo se trata como no disponible. Las referencias se comparten entre el
 * listado y el detalle para no repetir los joins.
 */
function createReferencesResolver(programs: readonly EventProgram[]) {
  const unitsById = new Map(mockActivityCatalog.organizationalUnits.map((unit) => [unit.id, unit]));
  const programsById = new Map(programs.map((program) => [program.id, program]));
  const classroomsById = new Map(
    mockActivityCatalog.classrooms.map((classroom) => [classroom.id, classroom]),
  );

  return (activity: Activity): PublicActivityReferences | null => {
    const program = programsById.get(activity.eventProgramId);
    const unit = program ? unitsById.get(program.organizationalUnitId) : undefined;

    if (!program || !unit || program.status !== "ACTIVE") {
      return null;
    }

    const classroom = activity.classroomId ? classroomsById.get(activity.classroomId) : undefined;

    return {
      classroom: classroom
        ? { building: classroom.building, id: classroom.id, name: classroom.name }
        : null,
      program,
      unit,
    };
  };
}

/** Proyeccion comun del listado y del detalle, sin el estado ni los campos propios. */
function projectPublicActivityBase(
  activity: Activity,
  references: PublicActivityReferences,
): Omit<PublicActivity, "status"> {
  const { classroom, program, unit } = references;

  return {
    bannerUrl: activity.bannerUrl,
    capacity: activity.capacity,
    classroom,
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
  };
}

/**
 * Deriva la agenda publica desde el catalogo de demostracion.
 *
 * No se mantiene una segunda lista de actividades: el read model publico es un
 * subconjunto del administrativo, asi que se proyecta en lugar de duplicarse.
 * Solo se publican las actividades con estado publico de programas activos, que
 * es lo que el listado publico del API devuelve. El detalle anade las canceladas
 * con su motivo y los inscritos, sin exponer equipamiento ni asistencias.
 */
export type MockPublicActivityCatalogAdapterOptions = {
  /** Registro vivo de actividades de la composicion; sin el, el fixture congelado. */
  readActivities?: () => readonly Activity[] | Promise<readonly Activity[]>;
  /** Programas actuales de la composicion; sin el, el fixture congelado. */
  readEventPrograms?: () => readonly EventProgram[] | Promise<readonly EventProgram[]>;
};

export function createMockPublicActivityCatalogAdapter({
  readActivities = () => mockActivityCatalog.activities,
  readEventPrograms = () => mockActivityCatalog.eventPrograms,
}: MockPublicActivityCatalogAdapterOptions = {}): PublicActivityCatalogAdapter {
  return {
    getPublicActivity: async (id: string): Promise<PublicActivityDetail | null> => {
      const [activities, programs] = await Promise.all([readActivities(), readEventPrograms()]);
      const resolveReferences = createReferencesResolver(programs);
      const activity = activities.find((candidate) => candidate.id === id);
      const references = activity ? resolveReferences(activity) : null;

      if (!activity || !references || !isPublicDetail(activity)) {
        return null;
      }

      return structuredClone({
        ...projectPublicActivityBase(activity, references),
        cancelReason: activity.cancelReason,
        enrolledCount: activity.enrolledCount,
        status: activity.status,
      });
    },
    loadPublicActivities: async (): Promise<PublicActivityCatalog> => {
      const [activities, programs] = await Promise.all([readActivities(), readEventPrograms()]);
      const resolveReferences = createReferencesResolver(programs);
      const projected: PublicActivity[] = activities
        .filter(isPublicActivity)
        .flatMap((activity) => {
          const references = resolveReferences(activity);

          return references
            ? [{ ...projectPublicActivityBase(activity, references), status: activity.status }]
            : [];
        });

      return structuredClone({ activities: projected });
    },
  };
}
