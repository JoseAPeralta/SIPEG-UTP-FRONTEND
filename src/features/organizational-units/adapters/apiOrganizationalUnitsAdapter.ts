import type { OrganizationalUnitsAdapter } from "@/app/adapters/contracts";
import { apiRequest, type ApiClientOptions } from "@/app/adapters/http/apiClient";

import { mapOrganizationalUnitsPage } from "./organizationalUnitsMapper";

const PAGE_LIMIT = 50;

export type ApiOrganizationalUnitsAdapterOptions = Pick<
  ApiClientOptions,
  "environment" | "fetcher"
>;

export function createApiOrganizationalUnitsAdapter(
  options: ApiOrganizationalUnitsAdapterOptions = {},
): OrganizationalUnitsAdapter {
  return {
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
  };
}
