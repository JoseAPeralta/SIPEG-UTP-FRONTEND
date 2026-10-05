import type { CareersAdapter } from "@/app/adapters/contracts";
import { apiRequest, type ApiClientOptions } from "@/app/adapters/http/apiClient";

import { mapCareerResponse, mapCareersPage } from "./careersMapper";
import type { CreateCareerRequest, UpdateCareerRequest } from "../model/careerRequests";

const PAGE_LIMIT = 50;

export type ApiCareersAdapterOptions = Pick<ApiClientOptions, "environment" | "fetcher">;

type AccessTokenReader = () => string | null | undefined;

function jsonRequest(method: "PATCH" | "POST", body: unknown): RequestInit {
  return { body: JSON.stringify(body), headers: { "Content-Type": "application/json" }, method };
}

export function createApiCareersAdapter(
  options: ApiCareersAdapterOptions = {},
  readAccessToken: AccessTokenReader = () => null,
): CareersAdapter {
  return {
    async createCareer(request: CreateCareerRequest) {
      const body: CreateCareerRequest = {
        code: request.code,
        description: request.description,
        name: request.name,
        unitId: request.unitId,
      };
      const payload = await apiRequest<unknown>("/api/v1/careers", {
        ...options,
        auth: { accessToken: readAccessToken(), mode: "bearer" },
        requestInit: jsonRequest("POST", body),
      });
      return mapCareerResponse(payload, "careers.create");
    },
    async deleteCareer(careerId: string) {
      await apiRequest<void>(`/api/v1/careers/${encodeURIComponent(careerId)}`, {
        ...options,
        auth: { accessToken: readAccessToken(), mode: "bearer" },
        requestInit: { method: "DELETE" },
      });
    },
    async loadCareers() {
      const careers = [];
      let page = 1;
      let totalPages: number;

      do {
        const payload = await apiRequest<unknown>(
          `/api/v1/careers?page=${page}&limit=${PAGE_LIMIT}`,
          { ...options, auth: { mode: "none" } },
        );
        const result = mapCareersPage(payload);
        careers.push(...result.items);
        totalPages = result.totalPages;
        page += 1;
      } while (page <= totalPages);

      return careers;
    },
    async updateCareer(careerId: string, request: UpdateCareerRequest) {
      const body: UpdateCareerRequest = {};
      if (request.name !== undefined) body.name = request.name;
      if (request.code !== undefined) body.code = request.code;
      if (request.description !== undefined) body.description = request.description;
      if (request.unitId !== undefined) body.unitId = request.unitId;
      const payload = await apiRequest<unknown>(`/api/v1/careers/${encodeURIComponent(careerId)}`, {
        ...options,
        auth: { accessToken: readAccessToken(), mode: "bearer" },
        requestInit: jsonRequest("PATCH", body),
      });
      return mapCareerResponse(payload, "careers.update");
    },
  };
}
