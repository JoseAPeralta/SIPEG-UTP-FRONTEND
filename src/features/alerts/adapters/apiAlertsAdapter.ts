import type { AlertsAdapter } from "@/app/adapters/contracts";
import {
  apiRequest,
  type ApiClientOptions,
  type ApiRequestAuth,
} from "@/app/adapters/http/apiClient";

import type { AlertFilters } from "../model/alert";

import { mapAlertResponse, mapAlertsPage, mapMarkAllAlertsReadResult } from "./alertsMapper";

const PAGE_SIZE = 20;

export type ApiAlertsAdapterOptions = Pick<ApiClientOptions, "environment" | "fetcher">;

type AccessTokenReader = () => string | null | undefined;

/**
 * Arma la consulta privada: pagina, limite contractual y los filtros presentes. El destinatario
 * nunca viaja en la URL; lo impone el token.
 */
export function alertsQuery(filters: AlertFilters, page: number): string {
  const params = new URLSearchParams({ limit: String(PAGE_SIZE), page: String(page) });

  if (filters.isRead !== undefined) params.set("isRead", String(filters.isRead));
  if (filters.type) params.set("type", filters.type);

  return `/api/v1/alerts?${params.toString()}`;
}

export function createApiAlertsAdapter(
  options: ApiAlertsAdapterOptions = {},
  readAccessToken: AccessTokenReader = () => null,
): AlertsAdapter {
  const bearer = () =>
    ({ accessToken: readAccessToken(), mode: "bearer" }) satisfies ApiRequestAuth;

  return {
    async loadAlertsPage(filters: AlertFilters, page: number) {
      const payload = await apiRequest<unknown>(alertsQuery(filters, page), {
        ...options,
        auth: bearer(),
      });

      return mapAlertsPage(payload);
    },
    async markAlertRead(id: string) {
      const payload = await apiRequest<unknown>(`/api/v1/alerts/${encodeURIComponent(id)}/read`, {
        ...options,
        auth: bearer(),
        requestInit: { method: "PATCH" },
      });

      return mapAlertResponse(payload);
    },
    async markAllAlertsRead() {
      const payload = await apiRequest<unknown>("/api/v1/alerts/read-all", {
        ...options,
        auth: bearer(),
        requestInit: { method: "POST" },
      });

      return mapMarkAllAlertsReadResult(payload);
    },
  };
}
