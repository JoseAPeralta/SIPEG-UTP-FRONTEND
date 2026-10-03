import type { ClassroomsAdapter } from "@/app/adapters/contracts";
import { apiRequest, type ApiClientOptions } from "@/app/adapters/http/apiClient";

import { mapClassroomsPage } from "./classroomsMapper";

const PAGE_LIMIT = 50;

export type ApiClassroomsAdapterOptions = Pick<ApiClientOptions, "environment" | "fetcher">;

export function createApiClassroomsAdapter(
  options: ApiClassroomsAdapterOptions = {},
): ClassroomsAdapter {
  return {
    async loadClassrooms() {
      const classrooms = [];
      let page = 1;
      let totalPages: number;

      do {
        const payload = await apiRequest<unknown>(
          `/api/v1/classrooms?page=${page}&limit=${PAGE_LIMIT}`,
          { ...options, auth: { mode: "none" } },
        );
        const result = mapClassroomsPage(payload);
        classrooms.push(...result.items);
        totalPages = result.totalPages;
        page += 1;
      } while (page <= totalPages);

      return classrooms;
    },
  };
}
