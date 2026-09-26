import type { AuthAdapter, AuthCredentials } from "@/app/adapters/contracts";
import { apiRequest, type ApiClientOptions } from "@/app/adapters/http/apiClient";

import { mapAuthenticatedUser, mapAuthTokens, readAuthEnvelopeData } from "./authMapper";

export type ApiAuthAdapterOptions = Pick<ApiClientOptions, "environment" | "fetcher">;

function jsonRequest(body: unknown): RequestInit {
  return {
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  };
}

export function createApiAuthAdapter(options: ApiAuthAdapterOptions = {}): AuthAdapter {
  return {
    async loadCurrentUser(accessToken: string) {
      const payload = await apiRequest<unknown>("/api/v1/users/me", {
        ...options,
        requestInit: { headers: { Authorization: `Bearer ${accessToken}` } },
      });

      return mapAuthenticatedUser(readAuthEnvelopeData(payload, "users.me"), "users.me.data");
    },

    async login(credentials: AuthCredentials) {
      const payload = await apiRequest<unknown>("/api/v1/auth/login", {
        ...options,
        requestInit: jsonRequest(credentials),
      });

      return mapAuthTokens(readAuthEnvelopeData(payload, "auth.login"), "auth.login.data");
    },

    async logout(refreshToken: string) {
      const payload = await apiRequest<unknown>("/api/v1/auth/logout", {
        ...options,
        requestInit: jsonRequest({ refreshToken }),
      });

      readAuthEnvelopeData(payload, "auth.logout");
    },

    async refresh(refreshToken: string) {
      const payload = await apiRequest<unknown>("/api/v1/auth/refresh", {
        ...options,
        requestInit: jsonRequest({ refreshToken }),
      });

      return mapAuthTokens(readAuthEnvelopeData(payload, "auth.refresh"), "auth.refresh.data");
    },
  };
}
