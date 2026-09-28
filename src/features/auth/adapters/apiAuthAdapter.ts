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
        auth: { accessToken, mode: "bearer" },
      });

      return mapAuthenticatedUser(readAuthEnvelopeData(payload, "users.me"), "users.me.data");
    },

    async login(credentials: AuthCredentials) {
      const payload = await apiRequest<unknown>("/api/v1/auth/login", {
        ...options,
        auth: { mode: "none" },
        requestInit: jsonRequest(credentials),
      });

      return mapAuthTokens(readAuthEnvelopeData(payload, "auth.login"), "auth.login.data");
    },

    async logout(refreshToken: string) {
      const payload = await apiRequest<unknown>("/api/v1/auth/logout", {
        ...options,
        auth: { mode: "none" },
        requestInit: jsonRequest({ refreshToken }),
      });

      readAuthEnvelopeData(payload, "auth.logout");
    },

    async refresh(refreshToken: string) {
      const payload = await apiRequest<unknown>("/api/v1/auth/refresh", {
        ...options,
        auth: { mode: "none" },
        requestInit: jsonRequest({ refreshToken }),
      });

      return mapAuthTokens(readAuthEnvelopeData(payload, "auth.refresh"), "auth.refresh.data");
    },

    async verifyEmail(token: string) {
      await apiRequest<unknown>("/api/v1/auth/verify-email", {
        ...options,
        auth: { mode: "none" },
        requestInit: jsonRequest({ token }),
      });
    },
  };
}
