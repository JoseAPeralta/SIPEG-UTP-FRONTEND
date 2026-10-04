import type { AdminUserFilters, UsersAdapter } from "@/app/adapters/contracts";
import {
  apiRequest,
  type ApiClientOptions,
  type ApiRequestAuth,
} from "@/app/adapters/http/apiClient";

import type { AdminUser } from "../model/adminUser";
import type { CreateAdminUserRequest, UpdateAdminUserRequest } from "../model/userRequests";

import { mapAdminUserResponse, mapAdminUsersPage } from "./usersMapper";

const PAGE_LIMIT = 50;
const PAGE_SIZE = 20;

export type ApiUsersAdapterOptions = Pick<ApiClientOptions, "environment" | "fetcher">;

type AccessTokenReader = () => string | null | undefined;

function jsonRequest(method: "PATCH" | "POST", body: unknown): RequestInit {
  return { body: JSON.stringify(body), headers: { "Content-Type": "application/json" }, method };
}

/** Arma los parametros del contrato omitiendo los filtros ausentes, para no inventar busquedas. */
export function adminUsersQuery(filters: AdminUserFilters, page: number): string {
  const params = new URLSearchParams({ limit: String(PAGE_SIZE), page: String(page) });

  if (filters.q) params.set("q", filters.q);
  if (filters.globalRole) params.set("globalRole", filters.globalRole);
  if (filters.isActive !== undefined) params.set("isActive", String(filters.isActive));
  if (filters.unitId) params.set("unitId", filters.unitId);
  if (filters.careerId) params.set("careerId", filters.careerId);

  return `/api/v1/admin/users?${params.toString()}`;
}

export function createApiUsersAdapter(
  options: ApiUsersAdapterOptions = {},
  readAccessToken: AccessTokenReader = () => null,
): UsersAdapter {
  const bearer = () =>
    ({ accessToken: readAccessToken(), mode: "bearer" }) satisfies ApiRequestAuth;

  return {
    async createUser(request: CreateAdminUserRequest) {
      const body: CreateAdminUserRequest = {
        email: request.email,
        firstName: request.firstName,
        identificationNumber: request.identificationNumber,
        lastName: request.lastName,
        password: request.password,
        unitId: request.unitId,
      };
      if (request.careerId !== undefined) body.careerId = request.careerId;

      const payload = await apiRequest<unknown>("/api/v1/admin/users", {
        ...options,
        auth: bearer(),
        requestInit: jsonRequest("POST", body),
      });

      return mapAdminUserResponse(payload, "adminUsers.create");
    },
    async getUser(userId: string) {
      const payload = await apiRequest<unknown>(
        `/api/v1/admin/users/${encodeURIComponent(userId)}`,
        { ...options, auth: bearer() },
      );

      return mapAdminUserResponse(payload, "adminUsers.get");
    },
    async loadUsers() {
      const users: AdminUser[] = [];
      let page = 1;
      let totalPages: number;

      do {
        const payload = await apiRequest<unknown>(
          `/api/v1/admin/users?page=${page}&limit=${PAGE_LIMIT}`,
          { ...options, auth: bearer() },
        );
        const result = mapAdminUsersPage(payload);
        users.push(...result.items);
        totalPages = result.totalPages;
        page += 1;
      } while (page <= totalPages);

      return users;
    },
    async loadUsersPage(filters: AdminUserFilters, page: number) {
      const payload = await apiRequest<unknown>(adminUsersQuery(filters, page), {
        ...options,
        auth: bearer(),
      });

      return mapAdminUsersPage(payload);
    },
    async updateUser(userId: string, request: UpdateAdminUserRequest) {
      const body: UpdateAdminUserRequest = {};
      if (request.globalRole !== undefined) body.globalRole = request.globalRole;
      if (request.isActive !== undefined) body.isActive = request.isActive;
      if (request.unitId !== undefined) body.unitId = request.unitId;
      if (request.careerId !== undefined) body.careerId = request.careerId;

      const payload = await apiRequest<unknown>(
        `/api/v1/admin/users/${encodeURIComponent(userId)}`,
        { ...options, auth: bearer(), requestInit: jsonRequest("PATCH", body) },
      );

      return mapAdminUserResponse(payload, "adminUsers.update");
    },
  };
}
