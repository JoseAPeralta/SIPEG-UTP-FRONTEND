import type { ClassroomsAdapter, ClassroomFilters } from "@/app/adapters/contracts";
import { ApiError } from "@/app/adapters/http/apiClient";
import { classroomAvailability } from "@/data/mock/classroomAvailability";
import { activities as mockActivities } from "@/data/mock/activities";
import { classrooms } from "@/data/mock/classrooms";
import type { Activity } from "@/types/domain";

import type { ClassroomAvailability, ClassroomDetail } from "../model/classroomDetail";
import type {
  AddClassroomAvailabilityRequest,
  CreateClassroomRequest,
  UpdateClassroomRequest,
} from "../model/classroomRequests";
import {
  isAvailableClassroomsCriteriaValid,
  normalizeAvailableClassroomsCriteria,
  type AvailableClassroomsCriteria,
} from "../model/availableClassrooms";

const INVALID_REQUEST = "La solicitud no es valida.";
const NOT_FOUND = "No se encontro el recurso solicitado.";
const CONFLICT = "La operacion entra en conflicto con el estado actual.";

function conflict(): ApiError {
  return new ApiError(CONFLICT, 409);
}

function notFound(): ApiError {
  return new ApiError(NOT_FOUND, 404);
}

function invalidRequest(): ApiError {
  return new ApiError(INVALID_REQUEST, 400);
}

type Interval = {
  endTime: string;
  startTime: string;
};

/**
 * Dos intervalos se solapan cuando cada uno empieza antes de que el otro termine. Comparar el texto
 * HH:mm es seguro porque el formato es de ancho fijo y el mapper ya lo valido. Los intervalos
 * adyacentes no se solapan: una ventana que termina a las 09:00 y otra que empieza a las 09:00
 * quedan aBuen escribir, que es justo lo que el backend acepta.
 */
function overlaps(candidate: Interval, existing: Interval): boolean {
  return candidate.startTime < existing.endTime && existing.startTime < candidate.endTime;
}

function isReserved(classroomId: string, activityCatalog: readonly Activity[]): boolean {
  return activityCatalog.some(
    (activity) =>
      activity.classroomId === classroomId &&
      (activity.status === "SCHEDULED" || activity.status === "ONGOING"),
  );
}

function isoWeekDay(date: string): number {
  const day = new Date(`${date}T12:00:00`).getDay();
  return day === 0 ? 7 : day;
}

function coversInterval(
  classroom: ClassroomDetail,
  criteria: AvailableClassroomsCriteria,
): boolean {
  const dayOfWeek = isoWeekDay(criteria.date);

  return classroom.availability.some(
    (window) =>
      window.dayOfWeek === dayOfWeek &&
      window.startTime <= criteria.startTime &&
      criteria.endTime <= window.endTime,
  );
}

function isOccupied(
  classroomId: string,
  criteria: AvailableClassroomsCriteria,
  activityCatalog: readonly Activity[],
): boolean {
  return activityCatalog.some(
    (activity) =>
      activity.classroomId === classroomId &&
      activity.date === criteria.date &&
      (activity.status === "SCHEDULED" || activity.status === "ONGOING") &&
      overlaps(criteria, activity),
  );
}

function matchesFilters(
  classroom: ClassroomDetail,
  filters: ClassroomFilters | undefined,
): boolean {
  if (filters?.type && classroom.type !== filters.type) return false;
  if (filters?.minCapacity !== undefined && classroom.capacity < filters.minCapacity) return false;
  if (filters?.amenity && !classroom.amenities.includes(filters.amenity)) return false;

  return true;
}

export type CreateMockClassroomsAdapterOptions = {
  activities?: readonly Activity[];
  /** Registro vivo de actividades de la composicion; sin el, la opcion `activities`. */
  readActivities?: () => readonly Activity[];
};

export function createMockClassroomsAdapter({
  activities: activityCatalog = mockActivities,
  readActivities,
}: CreateMockClassroomsAdapterOptions = {}): ClassroomsAdapter {
  const readCatalog = readActivities ?? (() => activityCatalog);
  const catalog: ClassroomDetail[] = classrooms.map((classroom) => ({
    ...structuredClone(classroom),
    availability: structuredClone(classroomAvailability[classroom.id] ?? []),
  }));

  function findOrReject(classroomId: string): ClassroomDetail {
    const classroom = catalog.find((candidate) => candidate.id === classroomId);
    if (!classroom) throw notFound();
    return classroom;
  }

  function snapshot(classroom: ClassroomDetail): ClassroomDetail {
    return structuredClone(classroom);
  }

  return {
    addClassroomAmenity(classroomId, amenity) {
      const classroom = findOrReject(classroomId);
      const exists = classroom.amenities.some(
        (candidate) => candidate.toLowerCase() === amenity.toLowerCase(),
      );
      if (exists) return Promise.reject(conflict());

      classroom.amenities.push(amenity);
      return Promise.resolve(snapshot(classroom));
    },

    addClassroomAvailability(classroomId, request: AddClassroomAvailabilityRequest) {
      const classroom = findOrReject(classroomId);
      if (request.startTime >= request.endTime) return Promise.reject(invalidRequest());

      const overlapsSameDay = classroom.availability.some(
        (window) =>
          window.dayOfWeek === request.dayOfWeek &&
          overlaps({ endTime: request.endTime, startTime: request.startTime }, window),
      );
      if (overlapsSameDay) return Promise.reject(conflict());

      const window: ClassroomAvailability = {
        dayOfWeek: request.dayOfWeek,
        endTime: request.endTime,
        id: `availability-${classroomId}-${catalog.length}-${classroom.availability.length}`,
        period: request.period,
        startTime: request.startTime,
      };
      classroom.availability.push(window);
      return Promise.resolve(snapshot(classroom));
    },

    createClassroom(request: CreateClassroomRequest) {
      const classroom: ClassroomDetail = {
        ...structuredClone(request),
        amenities: [],
        availability: [],
        id: `classroom-${catalog.length + 1}`,
        isActive: true,
      };
      catalog.push(classroom);
      return Promise.resolve(snapshot(classroom));
    },

    getClassroom(classroomId) {
      return Promise.resolve(snapshot(findOrReject(classroomId)));
    },

    loadAvailableClassrooms(criteria) {
      const normalized = normalizeAvailableClassroomsCriteria(criteria);
      if (!isAvailableClassroomsCriteriaValid(normalized)) return Promise.reject(invalidRequest());

      return Promise.resolve(
        structuredClone(
          catalog.filter(
            (classroom) =>
              classroom.isActive &&
              matchesFilters(classroom, normalized) &&
              coversInterval(classroom, normalized) &&
              !isOccupied(classroom.id, normalized, readCatalog()),
          ),
        ),
      );
    },

    loadClassrooms(filters) {
      // El backend solo devuelve aulas activas cuando se omite `isActive`; `"all"` es la unica
      // forma de obtener las inactivas y por eso el frontend recorre dos listas.
      const wantedIsActive =
        filters?.isActive === "all" ? undefined : filters?.isActive !== "inactive";
      const matches = catalog.filter(
        (classroom) =>
          matchesFilters(classroom, filters) &&
          (wantedIsActive === undefined || classroom.isActive === wantedIsActive),
      );

      return Promise.resolve(structuredClone(matches));
    },

    removeClassroomAmenity(classroomId, amenity) {
      const classroom = findOrReject(classroomId);
      const index = classroom.amenities.findIndex(
        (candidate) => candidate.toLowerCase() === amenity.toLowerCase(),
      );
      if (index === -1) return Promise.reject(notFound());

      classroom.amenities.splice(index, 1);
      return Promise.resolve(snapshot(classroom));
    },

    removeClassroomAvailability(classroomId, availabilityId) {
      const classroom = findOrReject(classroomId);
      const index = classroom.availability.findIndex((window) => window.id === availabilityId);
      if (index === -1) return Promise.reject(notFound());

      classroom.availability.splice(index, 1);
      return Promise.resolve(snapshot(classroom));
    },

    updateClassroom(classroomId, request: UpdateClassroomRequest) {
      const classroom = findOrReject(classroomId);
      if (request.isActive === false && isReserved(classroomId, readCatalog())) {
        return Promise.reject(conflict());
      }

      if (request.name !== undefined) classroom.name = request.name;
      if (request.type !== undefined) classroom.type = request.type;
      if (request.capacity !== undefined) classroom.capacity = request.capacity;
      if (request.building !== undefined) classroom.building = request.building;
      if (request.floor !== undefined) classroom.floor = request.floor;
      if (request.isActive !== undefined) classroom.isActive = request.isActive;

      return Promise.resolve(snapshot(classroom));
    },
  };
}
