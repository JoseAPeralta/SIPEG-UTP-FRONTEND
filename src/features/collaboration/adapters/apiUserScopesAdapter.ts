import type { UserScopesAdapter } from "@/app/adapters/contracts";
import {
  apiRequest,
  type ApiClientOptions,
  type ApiRequestAuth,
} from "@/app/adapters/http/apiClient";

import type { UserScope, UserScopeFilters } from "../model/userScopes";

import { mapUserScopesPage } from "./userScopesMapper";

const PAGE_LIMIT = 50;

export type ApiUserScopesAdapterOptions = Pick<ApiClientOptions, "environment" | "fetcher">;

type AccessTokenReader = () => string | null | undefined;

/** Arma la consulta de descubrimiento: pagina, limite maximo y el filtro opcional del contrato. */
export function userScopesQuery(filters: UserScopeFilters, page: number): string {
  const params = new URLSearchParams({ limit: String(PAGE_LIMIT), page: String(page) });

  if (filters.type) params.set("type", filters.type);

  return `/api/v1/users/me/scopes?${params.toString()}`;
}

/**
 * Descubrimiento de scopes propia del usuario autenticado.
 *
 * Una sola operacion paginada reemplaza cualquier intento de preguntar permiso por recurso (N+1).
 * El adapter no filtra por estado: el backend ya decidio que scopes son accesibles, incluidos los
 * no publicos, y esa respuesta es la que se expone.
 */
export function createApiUserScopesAdapter(
  options: ApiUserScopesAdapterOptions = {},
  readAccessToken: AccessTokenReader = () => null,
): UserScopesAdapter {
  const bearer = () =>
    ({ accessToken: readAccessToken(), mode: "bearer" }) satisfies ApiRequestAuth;

  return {
    async loadUserScopes(filters: UserScopeFilters = {}) {
      const scopes: UserScope[] = [];
      let page = 1;
      let totalPages: number;

      do {
        const payload = await apiRequest<unknown>(userScopesQuery(filters, page), {
          ...options,
          auth: bearer(),
        });
        const result = mapUserScopesPage(payload);
        scopes.push(...result.items);
        totalPages = result.totalPages;
        page += 1;
      } while (page <= totalPages);

      return scopes;
    },
  };
}
