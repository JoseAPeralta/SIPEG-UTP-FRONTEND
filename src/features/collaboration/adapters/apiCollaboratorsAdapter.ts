import type { CollaboratorsAdapter } from "@/app/adapters/contracts";
import { apiRequest, type ApiClientOptions } from "@/app/adapters/http/apiClient";
import type { CollaborationScope } from "../model/ownPermissions";
import { mapCollaborator, mapCollaborators } from "./collaboratorsMapper";

const base = (scope: CollaborationScope) =>
  `/api/v1/${scope.type === "program" ? "event-programs" : "activities"}/${encodeURIComponent(scope.id)}`;
const path = (scope: CollaborationScope) => `${base(scope)}/collaborators`;
export function createApiCollaboratorsAdapter(
  options: Pick<ApiClientOptions, "environment" | "fetcher"> = {},
  readAccessToken: () => string | null | undefined = () => null,
): CollaboratorsAdapter {
  const request = (url: string, method = "GET", body?: unknown) =>
    apiRequest<unknown>(url, {
      ...options,
      auth: { mode: "bearer", accessToken: readAccessToken() },
      requestInit: {
        method,
        ...(body === undefined
          ? {}
          : { body: JSON.stringify(body), headers: { "Content-Type": "application/json" } }),
      },
    });
  return {
    async loadCollaborators(scope) {
      return mapCollaborators(await request(path(scope)));
    },
    async addCollaborator(scope, input) {
      return mapCollaborator(
        await request(path(scope), "POST", { userId: input.userId, role: input.role }),
      );
    },
    async changeCollaboratorRole(scope, userId, input) {
      return mapCollaborator(
        await request(`${path(scope)}/${encodeURIComponent(userId)}`, "PATCH", {
          role: input.role,
        }),
      );
    },
    async grantPermission(scope, input) {
      return mapCollaborator(
        await request(`${base(scope)}/permissions`, "POST", {
          userId: input.userId,
          permission: input.permission,
          validFrom: input.validFrom,
          validUntil: input.validUntil,
        }),
      );
    },
    async revokePermission(scope, input) {
      await request(
        `${base(scope)}/permissions/${encodeURIComponent(input.permission)}?userId=${encodeURIComponent(input.userId)}`,
        "DELETE",
      );
    },
    async removeCollaborator(scope, userId) {
      await request(`${path(scope)}/${encodeURIComponent(userId)}`, "DELETE");
    },
  };
}
