import type { PublicActivityCatalogAdapter } from "@/app/adapters/contracts";
import { ApiError, apiRequest, type ApiClientOptions } from "@/app/adapters/http/apiClient";
import type { PublicActivityCatalog } from "@/types/domain";

import type { PublicActivityDetail } from "../model/publicActivityDetail";

import { mapPublicActivityDetail } from "./publicActivityDetailMapper";
import { mapPublicActivityCatalog, readObject } from "./publicActivityMapper";

const PAGE_LIMIT = 50;

export type ApiPublicActivityCatalogAdapterOptions = Pick<
  ApiClientOptions,
  "environment" | "fetcher"
>;

export function createApiPublicActivityCatalogAdapter(
  options: ApiPublicActivityCatalogAdapterOptions = {},
): PublicActivityCatalogAdapter {
  return {
    async getPublicActivity(id: string): Promise<PublicActivityDetail | null> {
      const context = `activities/${id}`;

      try {
        // Igual que el listado, el detalle es anonimo: nunca envia
        // `Authorization` ni cookies, aunque exista sesion.
        const payload = await apiRequest<unknown>(`/api/v1/activities/${encodeURIComponent(id)}`, {
          ...options,
          auth: { mode: "none" },
        });

        return mapPublicActivityDetail(readObject(payload, context)["data"], context);
      } catch (error) {
        // El contrato responde 404 para una actividad inexistente o no publica:
        // la vista lo presenta como no disponible, no como fallo reintentable.
        if (error instanceof ApiError && error.status === 404) {
          return null;
        }

        throw error;
      }
    },
    async loadPublicActivities(): Promise<PublicActivityCatalog> {
      const activities = [];
      let page = 1;
      let totalPages: number;

      // El listado publico es anonimo: nunca se envia `Authorization`, ni aunque
      // exista sesion, porque el endpoint no lo honra. `when=all` pide los tres
      // estados publicos en una sola operacion por pagina.
      do {
        const payload = await apiRequest<unknown>(
          `/api/v1/activities?page=${page}&limit=${PAGE_LIMIT}&when=all`,
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
