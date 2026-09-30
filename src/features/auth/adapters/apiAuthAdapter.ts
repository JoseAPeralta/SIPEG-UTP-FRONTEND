import type {
  AuthAdapter,
  AuthCredentials,
  PasswordChangePayload,
  PasswordResetPayload,
  PasswordResetRequest,
  ProfileUpdateRequest,
} from "@/app/adapters/contracts";
import { apiRequest, type ApiClientOptions } from "@/app/adapters/http/apiClient";

import {
  mapAuthenticatedUser,
  mapAuthTokens,
  readAuthEnvelopeData,
  readEmptySuccessData,
} from "./authMapper";

export type ApiAuthAdapterOptions = Pick<ApiClientOptions, "environment" | "fetcher">;

function jsonRequest(body: unknown): RequestInit {
  return {
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  };
}

/**
 * Rebuilds the profile patch one property at a time. TypeScript already forbids email, role, state
 * and identifiers, but types are erased at runtime, so the allowlist is what actually prevents
 * mass assignment over server-controlled attributes. `undefined` is skipped and `null` is kept
 * because the contract uses `unitId: null` to select the "Otro" option.
 */
function profileUpdateBody(request: ProfileUpdateRequest): Record<string, string | null> {
  const body: Record<string, string | null> = {};

  if (request.careerId !== undefined) {
    body["careerId"] = request.careerId;
  }

  if (request.firstName !== undefined) {
    body["firstName"] = request.firstName;
  }

  if (request.lastName !== undefined) {
    body["lastName"] = request.lastName;
  }

  if (request.unitId !== undefined) {
    body["unitId"] = request.unitId;
  }

  return body;
}

export function createApiAuthAdapter(options: ApiAuthAdapterOptions = {}): AuthAdapter {
  return {
    async changePassword(accessToken: string, payload: PasswordChangePayload) {
      const response = await apiRequest<unknown>("/api/v1/auth/change-password", {
        ...options,
        auth: { accessToken, mode: "bearer" },
        requestInit: jsonRequest(payload),
      });

      readEmptySuccessData(response, "auth.changePassword");
    },

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

    async requestPasswordReset({ email }: PasswordResetRequest) {
      const payload = await apiRequest<unknown>("/api/v1/auth/forgot-password", {
        ...options,
        auth: { mode: "none" },
        requestInit: jsonRequest({ email }),
      });

      readEmptySuccessData(payload, "auth.forgotPassword");
    },

    async resetPassword(payload: PasswordResetPayload) {
      const response = await apiRequest<unknown>("/api/v1/auth/reset-password", {
        ...options,
        auth: { mode: "none" },
        requestInit: jsonRequest(payload),
      });

      readEmptySuccessData(response, "auth.resetPassword");
    },

    async updateCurrentUser(accessToken: string, request: ProfileUpdateRequest) {
      const payload = await apiRequest<unknown>("/api/v1/users/me", {
        ...options,
        auth: { accessToken, mode: "bearer" },
        requestInit: {
          body: JSON.stringify(profileUpdateBody(request)),
          headers: { "Content-Type": "application/json" },
          method: "PATCH",
        },
      });

      return mapAuthenticatedUser(readAuthEnvelopeData(payload, "users.me"), "users.me.data");
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
