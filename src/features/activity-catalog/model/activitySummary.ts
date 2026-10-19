import type { ActivitySummary } from "@/types/domain";

/**
 * Proyeccion de resumen de una actividad.
 *
 * El listado del contrato omite `cancelReason`, `equipment`, `enrolledCount` y `checkedInCount`;
 * esta allowlist garantiza que una respuesta con campos adicionales no los exponga a las tarjetas
 * ni a los selectores. Los ponentes se copian para que el resumen no comparta referencias con el
 * origen.
 */
export function toActivitySummary(activity: ActivitySummary): ActivitySummary {
  return {
    bannerUrl: activity.bannerUrl,
    capacity: activity.capacity,
    classroomId: activity.classroomId,
    date: activity.date,
    description: activity.description,
    endTime: activity.endTime,
    eventProgramId: activity.eventProgramId,
    id: activity.id,
    name: activity.name,
    speakers: activity.speakers.map((speaker) => ({
      firstName: speaker.firstName,
      id: speaker.id,
      lastName: speaker.lastName,
    })),
    startTime: activity.startTime,
    status: activity.status,
    type: activity.type,
  };
}
