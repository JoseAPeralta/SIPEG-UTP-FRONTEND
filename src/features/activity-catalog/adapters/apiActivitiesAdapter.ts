import type { ActivitiesAdapter } from "@/app/adapters/contracts";
import { apiRequest, type ApiClientOptions } from "@/app/adapters/http/apiClient";

import type { ActivityListFilters } from "../model/administrativeActivity";
import type {
  CancelActivityRequest,
  CreateActivityRequest,
  UpdateActivityRequest,
} from "../model/activityRequests";

import {
  mapActivitiesListPage,
  mapActivityMutationResponse,
  mapAdministrativeActivityDetail,
  readActivityEnvelopeData,
} from "./administrativeActivityMapper";

const PAGE_SIZE = 20;

export type ApiActivitiesAdapterOptions = Pick<ApiClientOptions, "environment" | "fetcher">;

function jsonRequest(method: "PATCH" | "POST", body: unknown): RequestInit {
  return {
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
    method,
  };
}

export function activityPath(activityId: string): string {
  return `/api/v1/activities/${encodeURIComponent(activityId)}`;
}

/** Arma los parametros del contrato omitiendo los filtros ausentes, para no inventar busquedas. */
export function programActivitiesPageQuery(
  programId: string,
  filters: ActivityListFilters,
  page: number,
): string {
  const params = new URLSearchParams({ limit: String(PAGE_SIZE), page: String(page) });

  if (filters.q) params.set("q", filters.q);
  if (filters.status) params.set("status", filters.status);
  if (filters.type) params.set("type", filters.type);
  if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
  if (filters.dateTo) params.set("dateTo", filters.dateTo);

  return `/api/v1/event-programs/${encodeURIComponent(programId)}/activities?${params.toString()}`;
}

function createBody(request: CreateActivityRequest): CreateActivityRequest {
  const body: CreateActivityRequest = {
    date: request.date,
    endTime: request.endTime,
    eventProgramId: request.eventProgramId,
    name: request.name,
    startTime: request.startTime,
    type: request.type,
  };

  if (request.bannerUrl !== undefined) body.bannerUrl = request.bannerUrl;
  if (request.classroomId !== undefined) body.classroomId = request.classroomId;
  if (request.description !== undefined) body.description = request.description;
  if (request.equipment !== undefined) body.equipment = request.equipment;
  if (request.maxCapacity !== undefined) body.maxCapacity = request.maxCapacity;
  if (request.speakers !== undefined) body.speakers = request.speakers;

  return body;
}

function cancelBody(request: CancelActivityRequest): CancelActivityRequest {
  const body: CancelActivityRequest = {};

  if (request.reason !== undefined) body.reason = request.reason;

  return body;
}

function updateBody(request: UpdateActivityRequest): UpdateActivityRequest {
  const body: UpdateActivityRequest = {};

  if (request.bannerUrl !== undefined) body.bannerUrl = request.bannerUrl;
  if (request.classroomId !== undefined) body.classroomId = request.classroomId;
  if (request.date !== undefined) body.date = request.date;
  if (request.description !== undefined) body.description = request.description;
  if (request.endTime !== undefined) body.endTime = request.endTime;
  if (request.equipment !== undefined) body.equipment = request.equipment;
  if (request.maxCapacity !== undefined) body.maxCapacity = request.maxCapacity;
  if (request.name !== undefined) body.name = request.name;
  if (request.speakers !== undefined) body.speakers = request.speakers;
  if (request.startTime !== undefined) body.startTime = request.startTime;
  if (request.status !== undefined) body.status = request.status;
  if (request.type !== undefined) body.type = request.type;

  return body;
}

/**
 * Cada operacion lee el token en el momento de la peticion: si la sesion rota entre llamadas, la
 * siguiente usa el Bearer vigente y ninguna sale sin `Authorization`.
 */
export function createApiActivitiesAdapter(
  options: ApiActivitiesAdapterOptions = {},
  readAccessToken: () => string | null | undefined = () => null,
): ActivitiesAdapter {
  return {
    async cancelActivity(activityId, request) {
      const payload = await apiRequest<unknown>(`${activityPath(activityId)}/cancel`, {
        ...options,
        auth: { accessToken: readAccessToken(), mode: "bearer" },
        requestInit: jsonRequest("POST", cancelBody(request)),
      });

      return mapActivityMutationResponse(payload, "activities.cancel");
    },

    async createActivity(request) {
      const payload = await apiRequest<unknown>("/api/v1/activities", {
        ...options,
        auth: { accessToken: readAccessToken(), mode: "bearer" },
        requestInit: jsonRequest("POST", createBody(request)),
      });

      return mapActivityMutationResponse(payload, "activities.create");
    },

    async deleteActivity(activityId) {
      await apiRequest<void>(activityPath(activityId), {
        ...options,
        auth: { accessToken: readAccessToken(), mode: "bearer" },
        requestInit: { method: "DELETE" },
      });
    },

    async getActivity(activityId) {
      const payload = await apiRequest<unknown>(activityPath(activityId), {
        ...options,
        auth: { accessToken: readAccessToken(), mode: "bearer" },
      });

      return mapAdministrativeActivityDetail(
        readActivityEnvelopeData(payload, "activities.detail"),
        "activities.detail.data",
      );
    },

    async loadProgramActivitiesPage(programId, filters, page) {
      const payload = await apiRequest<unknown>(
        programActivitiesPageQuery(programId, filters, page),
        {
          ...options,
          auth: { accessToken: readAccessToken(), mode: "bearer" },
        },
      );

      return mapActivitiesListPage(payload, "activities.page");
    },

    async updateActivity(activityId, request) {
      const payload = await apiRequest<unknown>(activityPath(activityId), {
        ...options,
        auth: { accessToken: readAccessToken(), mode: "bearer" },
        requestInit: jsonRequest("PATCH", updateBody(request)),
      });

      return mapActivityMutationResponse(payload, "activities.update");
    },
  };
}
