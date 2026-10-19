import type { EventProgramsAdapter } from "@/app/adapters/contracts";
import {
  apiRequest,
  type ApiClientOptions,
  type ApiRequestAuth,
} from "@/app/adapters/http/apiClient";
import type { EventProgram } from "@/types/domain";
import type {
  CreateEventProgramRequest,
  UpdateEventProgramRequest,
} from "../model/eventProgramRequests";
import type { EventProgramListFilters } from "../model/eventProgramList";
import {
  mapMutatedEventProgram,
  mapEventProgramsListPage,
  mapEventProgramsPage,
} from "./eventProgramsMapper";

const PAGE_LIMIT = 50;
const PAGE_SIZE = 20;

export type ApiEventProgramsAdapterOptions = Pick<ApiClientOptions, "environment" | "fetcher">;

function jsonRequest(method: "PATCH" | "POST", body: unknown): RequestInit {
  return {
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
    method,
  };
}

function eventProgramPath(programId: string, suffix = ""): string {
  return `/api/v1/event-programs/${encodeURIComponent(programId)}${suffix}`;
}

/** Arma los parametros del contrato omitiendo los filtros ausentes, para no inventar busquedas. */
export function eventProgramsPageQuery(filters: EventProgramListFilters, page: number): string {
  const params = new URLSearchParams({ limit: String(PAGE_SIZE), page: String(page) });

  if (filters.q) params.set("q", filters.q);
  if (filters.organizationalUnitId)
    params.set("organizationalUnitId", filters.organizationalUnitId);
  if (filters.status) params.set("status", filters.status);

  return `/api/v1/event-programs?${params.toString()}`;
}

export function createApiEventProgramsAdapter(
  options: ApiEventProgramsAdapterOptions = {},
  readAccessToken: () => string | null | undefined = () => null,
): EventProgramsAdapter {
  return {
    async archiveEventProgram(programId) {
      const payload = await apiRequest<unknown>(eventProgramPath(programId, "/archive"), {
        ...options,
        auth: { accessToken: readAccessToken(), mode: "bearer" },
        requestInit: { method: "POST" },
      });

      return mapMutatedEventProgram(payload);
    },
    async createEventProgram(request) {
      const body: CreateEventProgramRequest = {
        description: request.description,
        endDate: request.endDate,
        label: request.label,
        name: request.name,
        organizationalUnitId: request.organizationalUnitId,
        startDate: request.startDate,
      };
      const payload = await apiRequest<unknown>("/api/v1/event-programs", {
        ...options,
        auth: { accessToken: readAccessToken(), mode: "bearer" },
        requestInit: jsonRequest("POST", body),
      });

      return mapMutatedEventProgram(payload);
    },
    async reactivateEventProgram(programId) {
      const payload = await apiRequest<unknown>(eventProgramPath(programId, "/reactivate"), {
        ...options,
        auth: { accessToken: readAccessToken(), mode: "bearer" },
        requestInit: { method: "POST" },
      });

      return mapMutatedEventProgram(payload);
    },
    async updateEventProgram(programId, request) {
      const body: UpdateEventProgramRequest = {};
      if (request.bannerUrl !== undefined) body.bannerUrl = request.bannerUrl;
      if (request.description !== undefined) body.description = request.description;
      if (request.endDate !== undefined) body.endDate = request.endDate;
      if (request.label !== undefined) body.label = request.label;
      if (request.name !== undefined) body.name = request.name;
      if (request.startDate !== undefined) body.startDate = request.startDate;
      if (request.status !== undefined) body.status = request.status;

      const payload = await apiRequest<unknown>(eventProgramPath(programId), {
        ...options,
        auth: { accessToken: readAccessToken(), mode: "bearer" },
        requestInit: jsonRequest("PATCH", body),
      });

      return mapMutatedEventProgram(payload);
    },
    async loadEventProgramsPage(filters, page) {
      const payload = await apiRequest<unknown>(eventProgramsPageQuery(filters, page), {
        ...options,
        auth: { accessToken: readAccessToken(), mode: "bearer" },
      });

      return mapEventProgramsListPage(payload);
    },
    async loadEventPrograms(access, status) {
      const auth: ApiRequestAuth =
        access === "administrative"
          ? { accessToken: readAccessToken(), mode: "bearer" }
          : { mode: "none" };
      const statusParam = status ? `&status=${encodeURIComponent(status)}` : "";
      const programs: EventProgram[] = [];
      let page = 1;
      let totalPages: number;
      do {
        const payload = await apiRequest<unknown>(
          `/api/v1/event-programs?page=${page}&limit=${PAGE_LIMIT}${statusParam}`,
          { ...options, auth },
        );
        const result = mapEventProgramsPage(payload);
        programs.push(...result.items);
        totalPages = result.totalPages;
        page += 1;
      } while (page <= totalPages);
      return programs;
    },
  };
}
