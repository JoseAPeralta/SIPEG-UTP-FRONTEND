import type { UsersAdapter } from "@/app/adapters/contracts";
import { apiRequest, type ApiClientOptions } from "@/app/adapters/http/apiClient";

import type { AdminUser } from "../model/adminUser";

import { mapAdminUsersPage } from "./usersMapper";

const PAGE_LIMIT = 50;

export type ApiUsersAdapterOptions = Pick<ApiClientOptions, "environment" | "fetcher">;

type AccessTokenReader = () => string | null | undefined;

export function createApiUsersAdapter(
  options: ApiUsersAdapterOptions = {},
  readAccessToken: AccessTokenReader = () => null,
): UsersAdapter {
  return {
    async loadUsers() {
      const users: AdminUser[] = [];
      let page = 1;
      let totalPages: number;

      do {
        const payload = await apiRequest<unknown>(
          `/api/v1/admin/users?page=${page}&limit=${PAGE_LIMIT}`,
          { ...options, auth: { accessToken: readAccessToken(), mode: "bearer" } },
        );
        const result = mapAdminUsersPage(payload);
        users.push(...result.items);
        totalPages = result.totalPages;
        page += 1;
      } while (page <= totalPages);

      return users;
    },
  };
}
