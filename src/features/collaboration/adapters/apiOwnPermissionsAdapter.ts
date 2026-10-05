import type { OwnPermissionsAdapter } from "@/app/adapters/contracts";
import { apiRequest, type ApiClientOptions } from "@/app/adapters/http/apiClient";
import { mapOwnPermissions } from "./ownPermissionsMapper";

export function createApiOwnPermissionsAdapter(
  options: Pick<ApiClientOptions, "environment" | "fetcher"> = {},
  readAccessToken: () => string | null | undefined = () => null,
): OwnPermissionsAdapter {
  return {
    async loadOwnPermissions(scope) {
      const query = new URLSearchParams({ scope: scope.type, id: scope.id });
      const raw = await apiRequest<unknown>(`/api/v1/users/me/permissions?${query}`, {
        ...options,
        auth: { mode: "bearer", accessToken: readAccessToken() },
      });
      return mapOwnPermissions(raw, scope);
    },
  };
}
