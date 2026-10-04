import type { ClassroomsAdapter, ClassroomFilters } from "@/app/adapters/contracts";
import { apiRequest, type ApiClientOptions } from "@/app/adapters/http/apiClient";

import type {
  AddClassroomAvailabilityRequest,
  CreateClassroomRequest,
  UpdateClassroomRequest,
} from "../model/classroomRequests";
import {
  normalizeAvailableClassroomsCriteria,
  type AvailableClassroomsCriteria,
} from "../model/availableClassrooms";

import {
  mapAvailableClassroomsResponse,
  mapClassroomDetailResponse,
  mapClassroomsPage,
} from "./classroomsMapper";

const PAGE_LIMIT = 50;

export type ApiClassroomsAdapterOptions = Pick<ApiClientOptions, "environment" | "fetcher">;

type AccessTokenReader = () => string | null | undefined;

function jsonRequest(method: "DELETE" | "PATCH" | "POST", body?: unknown): RequestInit {
  if (body === undefined) return { method };
  return { body: JSON.stringify(body), headers: { "Content-Type": "application/json" }, method };
}

function classroomPath(classroomId: string) {
  return `/api/v1/classrooms/${encodeURIComponent(classroomId)}`;
}

/**
 * Serializa los filtros del contrato. `isActive: "all"` no se envia porque el enum solo admite
 * `"true"` y `"false"`: ese caso se resuelve recorriendo las dos listas.
 */
function buildListSearch(filters: ClassroomFilters | undefined): URLSearchParams {
  const search = new URLSearchParams();

  search.set("limit", String(PAGE_LIMIT));
  if (filters?.amenity) search.set("amenity", filters.amenity);
  if (filters?.isActive && filters.isActive !== "all") {
    search.set("isActive", filters.isActive === "active" ? "true" : "false");
  }
  if (filters?.minCapacity !== undefined) search.set("minCapacity", String(filters.minCapacity));
  if (filters?.type) search.set("type", filters.type);

  return search;
}

function buildAvailabilitySearch(criteria: AvailableClassroomsCriteria): URLSearchParams {
  const normalized = normalizeAvailableClassroomsCriteria(criteria);
  const search = new URLSearchParams({
    date: normalized.date,
    endTime: normalized.endTime,
    startTime: normalized.startTime,
  });

  if (normalized.amenity) search.set("amenity", normalized.amenity);
  if (normalized.minCapacity !== undefined)
    search.set("minCapacity", String(normalized.minCapacity));
  if (normalized.type) search.set("type", normalized.type);

  return search;
}

export function createApiClassroomsAdapter(
  options: ApiClassroomsAdapterOptions = {},
  readAccessToken: AccessTokenReader = () => null,
): ClassroomsAdapter {
  async function loadEveryPage(
    filters: ClassroomFilters | undefined,
    isActive: "active" | "inactive",
  ) {
    const classrooms = [];
    const search = buildListSearch({ ...filters, isActive });
    let page = 1;
    let totalPages: number;

    do {
      search.set("page", String(page));
      const payload = await apiRequest<unknown>(`/api/v1/classrooms?${search.toString()}`, {
        ...options,
        auth: { mode: "none" },
      });
      const result = mapClassroomsPage(payload);
      classrooms.push(...result.items);
      totalPages = result.totalPages;
      page += 1;
    } while (page <= totalPages);

    return classrooms;
  }

  return {
    async addClassroomAmenity(classroomId: string, amenity: string) {
      const payload = await apiRequest<unknown>(`${classroomPath(classroomId)}/amenities`, {
        ...options,
        auth: { accessToken: readAccessToken(), mode: "bearer" },
        requestInit: jsonRequest("POST", { amenity }),
      });

      return mapClassroomDetailResponse(payload, "classrooms.addAmenity");
    },

    async addClassroomAvailability(classroomId: string, request: AddClassroomAvailabilityRequest) {
      const body: AddClassroomAvailabilityRequest = {
        dayOfWeek: request.dayOfWeek,
        endTime: request.endTime,
        period: request.period,
        startTime: request.startTime,
      };
      const payload = await apiRequest<unknown>(`${classroomPath(classroomId)}/availability`, {
        ...options,
        auth: { accessToken: readAccessToken(), mode: "bearer" },
        requestInit: jsonRequest("POST", body),
      });

      return mapClassroomDetailResponse(payload, "classrooms.addAvailability");
    },

    async createClassroom(request: CreateClassroomRequest) {
      const body: CreateClassroomRequest = {
        building: request.building,
        capacity: request.capacity,
        floor: request.floor,
        name: request.name,
        type: request.type,
      };
      const payload = await apiRequest<unknown>("/api/v1/classrooms", {
        ...options,
        auth: { accessToken: readAccessToken(), mode: "bearer" },
        requestInit: jsonRequest("POST", body),
      });

      return mapClassroomDetailResponse(payload, "classrooms.create");
    },

    async getClassroom(classroomId: string) {
      const payload = await apiRequest<unknown>(classroomPath(classroomId), {
        ...options,
        auth: { mode: "none" },
      });

      return mapClassroomDetailResponse(payload, "classrooms.detail");
    },

    async loadAvailableClassrooms(criteria: AvailableClassroomsCriteria) {
      const payload = await apiRequest<unknown>(
        `/api/v1/classrooms/available?${buildAvailabilitySearch(criteria).toString()}`,
        {
          ...options,
          auth: { mode: "none" },
        },
      );

      return mapAvailableClassroomsResponse(payload, "classrooms.available");
    },

    async loadClassrooms(filters) {
      if (filters?.isActive === "all") {
        const [active, inactive] = await Promise.all([
          loadEveryPage(filters, "active"),
          loadEveryPage(filters, "inactive"),
        ]);

        return [...active, ...inactive];
      }

      return loadEveryPage(filters, filters?.isActive ?? "active");
    },

    async removeClassroomAmenity(classroomId: string, amenity: string) {
      const payload = await apiRequest<unknown>(
        `${classroomPath(classroomId)}/amenities/${encodeURIComponent(amenity)}`,
        {
          ...options,
          auth: { accessToken: readAccessToken(), mode: "bearer" },
          requestInit: jsonRequest("DELETE"),
        },
      );

      return mapClassroomDetailResponse(payload, "classrooms.removeAmenity");
    },

    async removeClassroomAvailability(classroomId: string, availabilityId: string) {
      const payload = await apiRequest<unknown>(
        `${classroomPath(classroomId)}/availability/${encodeURIComponent(availabilityId)}`,
        {
          ...options,
          auth: { accessToken: readAccessToken(), mode: "bearer" },
          requestInit: jsonRequest("DELETE"),
        },
      );

      return mapClassroomDetailResponse(payload, "classrooms.removeAvailability");
    },

    async updateClassroom(classroomId: string, request: UpdateClassroomRequest) {
      const body: UpdateClassroomRequest = {};
      if (request.building !== undefined) body.building = request.building;
      if (request.capacity !== undefined) body.capacity = request.capacity;
      if (request.floor !== undefined) body.floor = request.floor;
      if (request.isActive !== undefined) body.isActive = request.isActive;
      if (request.name !== undefined) body.name = request.name;
      if (request.type !== undefined) body.type = request.type;

      const payload = await apiRequest<unknown>(classroomPath(classroomId), {
        ...options,
        auth: { accessToken: readAccessToken(), mode: "bearer" },
        requestInit: jsonRequest("PATCH", body),
      });

      return mapClassroomDetailResponse(payload, "classrooms.update");
    },
  };
}
