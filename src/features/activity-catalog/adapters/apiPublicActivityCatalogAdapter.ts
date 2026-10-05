import type { PublicActivityCatalogAdapter } from "@/app/adapters/contracts";
import { apiRequest, type ApiClientOptions } from "@/app/adapters/http/apiClient";
import type { PublicActivityCatalog } from "@/types/domain";

import { mapPublicActivityCatalog } from "./publicActivityMapper";

const PAGE_LIMIT = 50;

export type ApiPublicActivityCatalogAdapterOptions = Pick<
  ApiClientOptions,
  "environment" | "fetcher"
>;

export function createApiPublicActivityCatalogAdapter(
  options: ApiPublicActivityCatalogAdapterOptions = {},
): PublicActivityCatalogAdapter {
  return {
    async loadPublicActivities(): Promise<PublicActivityCatalog> {
      const activities = [];
      let page = 1;
      let totalPages: number;

      // El listado publico es anonimo: nunca se envia `Authorization`, ni aunque
      // exista sesion, porque el endpoint no lo honra.
      do {
        const payload = await apiRequest<unknown>(
          `/api/v1/activities?page=${page}&limit=${PAGE_LIMIT}`,
          { ...options, auth: { mode: "none" } },
        );
        const mapped = mapPublicActivityCatalog(payload, `publicActivities[${page}]`);

        activities.push(...mapped.activities);
        totalPages = mapped.totalPages;
        page += 1;
      } while (page <= totalPages);

      return { activities };
    },
  };
}
