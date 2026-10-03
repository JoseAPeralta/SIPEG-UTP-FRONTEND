import type { CareersAdapter } from "@/app/adapters/contracts";
import { apiRequest, type ApiClientOptions } from "@/app/adapters/http/apiClient";

import { mapCareersPage } from "./careersMapper";

const PAGE_LIMIT = 50;

export type ApiCareersAdapterOptions = Pick<ApiClientOptions, "environment" | "fetcher">;

export function createApiCareersAdapter(options: ApiCareersAdapterOptions = {}): CareersAdapter {
  return {
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
  };
}
