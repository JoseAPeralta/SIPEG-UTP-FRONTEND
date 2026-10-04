import type { OrganizationalUnitsAdapter } from "@/app/adapters/contracts";
import { apiRequest, type ApiClientOptions } from "@/app/adapters/http/apiClient";

import { mapOrganizationalUnitsPage } from "./organizationalUnitsMapper";
import { mapOrganizationalUnitDetail } from "./organizationalUnitsMapper";
import type {
  CreateOrganizationalUnitRequest,
  UpdateOrganizationalUnitRequest,
} from "../model/organizationalUnitRequests";

const PAGE_LIMIT = 50;

export type ApiOrganizationalUnitsAdapterOptions = Pick<
  ApiClientOptions,
  "environment" | "fetcher"
>;

type AccessTokenReader = () => string | null | undefined;

function jsonRequest(method: "PATCH" | "POST", body?: unknown): RequestInit {
  if (body === undefined) return { method };
  return { body: JSON.stringify(body), headers: { "Content-Type": "application/json" }, method };
}

export function createApiOrganizationalUnitsAdapter(
  options: ApiOrganizationalUnitsAdapterOptions = {},
  readAccessToken: AccessTokenReader = () => null,
): OrganizationalUnitsAdapter {
  return {
    async createOrganizationalUnit(request: CreateOrganizationalUnitRequest) {
      const payload = await apiRequest<unknown>("/api/v1/organizational-units", {
        ...options,
        auth: { accessToken: readAccessToken(), mode: "bearer" },
        requestInit: jsonRequest("POST", request),
      });

      return mapOrganizationalUnitDetail(payload, "organizationalUnits.create");
    },

    async deactivateOrganizationalUnit(unitId: string) {
      const payload = await apiRequest<unknown>(
        `/api/v1/organizational-units/${encodeURIComponent(unitId)}/deactivate`,
        {
          ...options,
          auth: { accessToken: readAccessToken(), mode: "bearer" },
          requestInit: jsonRequest("POST"),
        },
      );

      return mapOrganizationalUnitDetail(payload, "organizationalUnits.deactivate");
    },

    async getOrganizationalUnit(unitId: string) {
      const payload = await apiRequest<unknown>(
        `/api/v1/organizational-units/${encodeURIComponent(unitId)}`,
        { ...options, auth: { mode: "none" } },
      );

      return mapOrganizationalUnitDetail(payload, "organizationalUnits.detail");
    },
    async loadOrganizationalUnits() {
      const units = [];
      let page = 1;
      let totalPages: number;

      do {
        const payload = await apiRequest<unknown>(
          `/api/v1/organizational-units?page=${page}&limit=${PAGE_LIMIT}`,
          { ...options, auth: { mode: "none" } },
        );
        const result = mapOrganizationalUnitsPage(payload);
        units.push(...result.items);
        totalPages = result.totalPages;
        page += 1;
      } while (page <= totalPages);

      return units;
    },

    async reactivateOrganizationalUnit(unitId: string) {
      const payload = await apiRequest<unknown>(
        `/api/v1/organizational-units/${encodeURIComponent(unitId)}/reactivate`,
        {
          ...options,
          auth: { accessToken: readAccessToken(), mode: "bearer" },
          requestInit: jsonRequest("POST"),
        },
      );

      return mapOrganizationalUnitDetail(payload, "organizationalUnits.reactivate");
    },

    async updateOrganizationalUnit(unitId: string, request: UpdateOrganizationalUnitRequest) {
      const body: UpdateOrganizationalUnitRequest = {};
      if (request.name !== undefined) body.name = request.name;
      if (request.description !== undefined) body.description = request.description;
      const payload = await apiRequest<unknown>(
        `/api/v1/organizational-units/${encodeURIComponent(unitId)}`,
        {
          ...options,
          auth: { accessToken: readAccessToken(), mode: "bearer" },
          requestInit: jsonRequest("PATCH", body),
        },
      );

      return mapOrganizationalUnitDetail(payload, "organizationalUnits.update");
    },
  };
}
