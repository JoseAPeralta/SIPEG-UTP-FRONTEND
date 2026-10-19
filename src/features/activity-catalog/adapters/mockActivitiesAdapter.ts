import type { ActivitiesAdapter } from "@/app/adapters/contracts";
import { ApiError } from "@/app/adapters/http/apiClient";
import { alerts } from "@/data/mock/alerts";
import { classroomAvailability } from "@/data/mock/classroomAvailability";
import { classrooms } from "@/data/mock/classrooms";
import { attendanceRecords } from "@/data/mock/operations";
import type {
  Activity,
  ActivitySpeaker,
  EventProgram,
  GlobalRole,
  OrganizationalUnit,
} from "@/types/domain";

import type {
  AdministrativeActivityDetail,
  AdministrativeActivityListItem,
  ActivityListFilters,
} from "../model/administrativeActivity";
import { normalizeActivityCancelReason } from "../model/activityLifecycle";
import type {
  ActivitySpeakerInput,
  CreateActivityRequest,
  UpdateActivityRequest,
} from "../model/activityRequests";

import type { MockActivityRegistry } from "./mockActivityRegistry";

const PAGE_SIZE = 20;

type Interval = {
  endTime: string;
  startTime: string;
};

function invalidRequest(): ApiError {
  return new ApiError("La solicitud no es valida.", 400);
}

function notFound(): ApiError {
  return new ApiError("No se encontro el recurso solicitado.", 404);
}

function conflict(): ApiError {
  return new ApiError("La operacion entra en conflicto con el estado actual.", 409);
}

function unauthorized(): ApiError {
  return new ApiError("No autorizado.", 401);
}

function forbidden(): ApiError {
  return new ApiError("No tiene permisos para esta accion.", 403);
}

/**
 * Retencion de la actividad segun el escenario completo: cualquier registro de asistencia o alerta
 * con destino `ACTIVITY`, aunque no se haya marcado como presente o ya este leida.
 */
export function hasRetainedActivityHistory(activityId: string): boolean {
  const hasAttendance = attendanceRecords.some((record) => record.activityId === activityId);
  const hasAlert = alerts.some(
    (alert) => alert.target.kind === "ACTIVITY" && alert.target.id === activityId,
  );

  return hasAttendance || hasAlert;
}

/**
 * Dos intervalos se solapan cuando cada uno empieza antes de que el otro termine. Comparar el texto
 * HH:mm es seguro porque el formato es de ancho fijo.
 */
function overlaps(candidate: Interval, existing: Interval): boolean {
  return candidate.startTime < existing.endTime && existing.startTime < candidate.endTime;
}

function isoWeekDay(date: string): number {
  const day = new Date(`${date}T12:00:00`).getDay();
  return day === 0 ? 7 : day;
}

function toStoredSpeakers(
  inputs: readonly ActivitySpeakerInput[],
  prefix: string,
): ActivitySpeaker[] {
  return inputs.map((speaker, index) => ({
    firstName: speaker.firstName,
    id: `${prefix}-${index + 1}`,
    lastName: speaker.lastName,
  }));
}

export type MockActivitiesAdapterOptions = {
  /** Programas de la misma composicion; sin el, la lectura usa el fixture congelado. */
  readEventPrograms?: () => Promise<EventProgram[]>;
  /** Unidades de la misma composicion, necesarias para embeber la unidad del programa. */
  readOrganizationalUnits?: () => Promise<OrganizationalUnit[]>;
  /** Rol de la sesion; sin identidad las mutaciones responden `401`. */
  readGlobalRole?: () => GlobalRole | undefined;
  /** Registro compartido con el resto de la composicion; sin el, cada factory mantiene el suyo. */
  registry?: MockActivityRegistry;
  /**
   * Permiso efectivo de borrado por actividad. Inyectable para escenarios explicitos de
   * colaborador; sin el, solo ADMIN queda autorizado. No se infiere del rol de colaboracion.
   */
  readCanDeleteActivity?: (activityId: string) => boolean | Promise<boolean>;
  /** Historial retenido de la actividad en todo el escenario; por defecto, asistencias y alertas. */
  readRetainedHistory?: (activityId: string) => boolean;
};

export function createMockActivitiesAdapter({
  readEventPrograms = () => Promise.resolve([]),
  readOrganizationalUnits = () => Promise.resolve([]),
  readGlobalRole = () => "ADMIN",
  registry,
  readCanDeleteActivity,
  readRetainedHistory = hasRetainedActivityHistory,
}: MockActivitiesAdapterOptions = {}): ActivitiesAdapter {
  const stored = registry ?? new Map<string, Activity>();
  let createdSequence = 0;

  async function canDelete(activityId: string): Promise<boolean> {
    if (readCanDeleteActivity) return readCanDeleteActivity(activityId);

    return readGlobalRole() === "ADMIN";
  }

  function nextActivityId(): string {
    let candidate: string;

    do {
      createdSequence += 1;
      candidate = `activity-created-${createdSequence}`;
    } while (stored.has(candidate));

    return candidate;
  }

  function requireSession() {
    if (!readGlobalRole()) throw unauthorized();
  }

  function findActivity(activityId: string): Activity {
    const activity = stored.get(activityId);
    if (!activity) throw notFound();

    return activity;
  }

  async function embed(activity: Activity): Promise<AdministrativeActivityDetail> {
    const [programs, units] = await Promise.all([readEventPrograms(), readOrganizationalUnits()]);
    const program = programs.find((candidate) => candidate.id === activity.eventProgramId);
    const unit = program
      ? units.find((candidate) => candidate.id === program.organizationalUnitId)
      : undefined;

    if (!program) {
      throw new Error(
        `El registro de actividades referencia el programa inexistente "${activity.eventProgramId}".`,
      );
    }
    if (!unit) {
      throw new Error(
        `El programa "${program.id}" referencia la unidad inexistente "${program.organizationalUnitId}".`,
      );
    }

    const classroom = activity.classroomId
      ? (classrooms.find((candidate) => candidate.id === activity.classroomId) ?? null)
      : null;

    return {
      bannerUrl: activity.bannerUrl,
      cancelReason: activity.cancelReason,
      capacity: activity.capacity,
      checkedInCount: activity.checkedInCount,
      classroom: classroom
        ? { building: classroom.building, id: classroom.id, name: classroom.name }
        : null,
      date: activity.date,
      description: activity.description,
      endTime: activity.endTime,
      enrolledCount: activity.enrolledCount,
      equipment: [...activity.equipment],
      eventProgram: { id: program.id, label: program.label, name: program.name },
      id: activity.id,
      name: activity.name,
      organizationalUnit: { id: unit.id, name: unit.name, type: unit.type },
      speakers: structuredClone(activity.speakers),
      startTime: activity.startTime,
      status: activity.status,
      type: activity.type,
    };
  }

  function matchesFilters(activity: Activity, filters: ActivityListFilters): boolean {
    if (filters.status && filters.status !== "ALL" && activity.status !== filters.status) {
      return false;
    }
    if (filters.type && activity.type !== filters.type) return false;
    if (filters.dateFrom && activity.date < filters.dateFrom) return false;
    if (filters.dateTo && activity.date > filters.dateTo) return false;
    if (filters.q) {
      const term = filters.q.trim().toLowerCase();
      const haystack = `${activity.name} ${activity.description ?? ""}`.toLowerCase();
      if (!haystack.includes(term)) return false;
    }

    return true;
  }

  /**
   * Reproduce las validaciones de aula del contrato: existencia, estado, capacidad, ventana de
   * disponibilidad y solape con actividades que reservan. `excluded` omite a la propia actividad al
   * editar su reserva, igual que el backend.
   */
  function assertClassroomFits(
    activity: Pick<Activity, "classroomId" | "capacity" | "date" | "startTime" | "endTime">,
    excludedActivityId?: string,
  ) {
    if (!activity.classroomId) return;

    const classroom = classrooms.find((candidate) => candidate.id === activity.classroomId);
    if (!classroom) throw notFound();
    if (!classroom.isActive) throw invalidRequest();
    if (activity.capacity !== null && activity.capacity > classroom.capacity) {
      throw invalidRequest();
    }

    const windows = classroomAvailability[classroom.id] ?? [];
    const dayOfWeek = isoWeekDay(activity.date);
    const covers = windows.some(
      (window) =>
        window.dayOfWeek === dayOfWeek &&
        window.startTime <= activity.startTime &&
        activity.endTime <= window.endTime,
    );
    if (!covers) throw conflict();

    const reserved = [...stored.values()].some(
      (candidate) =>
        candidate.id !== excludedActivityId &&
        candidate.classroomId === classroom.id &&
        candidate.date === activity.date &&
        (candidate.status === "SCHEDULED" || candidate.status === "ONGOING") &&
        overlaps(activity, candidate),
    );
    if (reserved) throw conflict();
  }

  function toListItem(detail: AdministrativeActivityDetail): AdministrativeActivityListItem {
    return {
      bannerUrl: detail.bannerUrl,
      capacity: detail.capacity,
      classroom: detail.classroom,
      date: detail.date,
      description: detail.description,
      endTime: detail.endTime,
      eventProgram: detail.eventProgram,
      id: detail.id,
      name: detail.name,
      organizationalUnit: detail.organizationalUnit,
      speakers: detail.speakers,
      startTime: detail.startTime,
      status: detail.status,
      type: detail.type,
    };
  }

  return {
    async createActivity(request: CreateActivityRequest) {
      requireSession();

      const programs = await readEventPrograms();
      const program = programs.find((candidate) => candidate.id === request.eventProgramId);
      if (!program) throw notFound();
      if (program.status !== "ACTIVE") throw invalidRequest();

      const activityId = nextActivityId();
      const activity: Activity = {
        bannerUrl: request.bannerUrl ?? null,
        cancelReason: null,
        capacity: request.maxCapacity ?? null,
        checkedInCount: 0,
        classroomId: request.classroomId ?? null,
        date: request.date,
        description: request.description ?? null,
        endTime: request.endTime,
        enrolledCount: 0,
        equipment: request.equipment ? [...request.equipment] : [],
        eventProgramId: request.eventProgramId,
        id: activityId,
        name: request.name,
        speakers: toStoredSpeakers(request.speakers ?? [], `speaker-${activityId}`),
        startTime: request.startTime,
        status: "DRAFT",
        type: request.type,
      };

      assertClassroomFits(activity);
      stored.set(activity.id, structuredClone(activity));

      return embed(activity);
    },

    async deleteActivity(activityId) {
      requireSession();

      const activity = findActivity(activityId);
      if (!(await canDelete(activityId))) throw forbidden();

      const programs = await readEventPrograms();
      const program = programs.find((candidate) => candidate.id === activity.eventProgramId);
      if (!program) throw notFound();
      if (activity.status !== "DRAFT") throw conflict();
      if (program.status !== "ACTIVE") throw conflict();
      if (readRetainedHistory(activityId)) throw conflict();

      stored.delete(activityId);
    },

    async getActivity(activityId) {
      return embed(findActivity(activityId));
    },

    async loadProgramActivitiesPage(programId, filters, page) {
      const programs = await readEventPrograms();
      if (!programs.some((program) => program.id === programId)) throw notFound();

      const filtered = [...stored.values()]
        .filter((activity) => activity.eventProgramId === programId)
        .filter((activity) => matchesFilters(activity, filters))
        .sort(
          (left, right) =>
            left.date.localeCompare(right.date) || left.startTime.localeCompare(right.startTime),
        );
      const total = filtered.length;
      const currentPage = Math.max(1, page);
      const start = (currentPage - 1) * PAGE_SIZE;
      const items = await Promise.all(
        filtered
          .slice(start, start + PAGE_SIZE)
          .map(async (activity) => toListItem(await embed(activity))),
      );

      return {
        items: structuredClone(items),
        limit: PAGE_SIZE,
        page: currentPage,
        total,
        totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
      };
    },

    async updateActivity(activityId, request: UpdateActivityRequest) {
      requireSession();

      const activity = findActivity(activityId);
      if (
        activity.status === "ONGOING" ||
        activity.status === "COMPLETED" ||
        activity.status === "CANCELLED"
      ) {
        throw conflict();
      }

      const next: Activity = { ...activity };
      if (request.bannerUrl !== undefined) next.bannerUrl = request.bannerUrl;
      if (request.classroomId !== undefined) next.classroomId = request.classroomId;
      if (request.date !== undefined) next.date = request.date;
      if (request.description !== undefined) next.description = request.description;
      if (request.endTime !== undefined) next.endTime = request.endTime;
      if (request.equipment !== undefined) next.equipment = [...request.equipment];
      if (request.maxCapacity !== undefined) next.capacity = request.maxCapacity;
      if (request.name !== undefined) next.name = request.name;
      if (request.speakers !== undefined) {
        next.speakers = toStoredSpeakers(request.speakers, `speaker-updated-${next.id}`);
      }
      if (request.startTime !== undefined) next.startTime = request.startTime;
      if (request.type !== undefined) next.type = request.type;
      if (request.status !== undefined) next.status = request.status;

      // Un cambio de nombre o descripcion no vuelve a validar la reserva: solo se comprueba el
      // aula cuando el parche toca el horario, la capacidad, el aula o publica la actividad.
      const touchesReservation =
        request.classroomId !== undefined ||
        request.date !== undefined ||
        request.endTime !== undefined ||
        request.maxCapacity !== undefined ||
        request.startTime !== undefined ||
        request.status === "SCHEDULED";
      if (touchesReservation) assertClassroomFits(next, next.id);

      stored.set(next.id, structuredClone(next));

      return embed(next);
    },

    async cancelActivity(activityId, request) {
      requireSession();

      const activity = findActivity(activityId);
      const programs = await readEventPrograms();
      const program = programs.find((candidate) => candidate.id === activity.eventProgramId);
      if (!program) throw notFound();
      if (program.status !== "ACTIVE") throw conflict();
      if (activity.status === "COMPLETED") throw conflict();
      if (activity.status === "CANCELLED") return embed(activity);

      const reason = normalizeActivityCancelReason(request.reason);
      const next: Activity = {
        ...activity,
        cancelReason: reason ?? null,
        status: "CANCELLED",
      };
      stored.set(next.id, structuredClone(next));

      return embed(next);
    },
  };
}
