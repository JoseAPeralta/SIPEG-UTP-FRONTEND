import type { AuthAdapter } from "@/app/adapters/contracts";
import { ApiError } from "@/app/adapters/http/apiClient";
import { mockAuthenticatedUser, mockAuthTokens } from "@/data/mock/auth";

export const MOCK_AUTH_EMAIL = mockAuthenticatedUser.email;
export const MOCK_AUTH_PASSWORD = "sipeg-demo";

export function createMockAuthAdapter(): AuthAdapter {
  return {
    loadCurrentUser(accessToken) {
      if (accessToken !== mockAuthTokens.accessToken) {
        return Promise.reject(new ApiError("Tu sesion no esta autorizada.", 401));
      }

      return Promise.resolve(mockAuthenticatedUser);
    },

    login(credentials) {
      if (
        credentials.email.trim().toLowerCase() !== MOCK_AUTH_EMAIL.toLowerCase() ||
        credentials.password !== MOCK_AUTH_PASSWORD
      ) {
        return Promise.reject(new ApiError("El correo o la contrasena no son correctos.", 401));
      }

      return Promise.resolve(mockAuthTokens);
    },

    logout: () => Promise.resolve(),

    refresh(refreshToken) {
      if (refreshToken !== mockAuthTokens.refreshToken) {
        return Promise.reject(new ApiError("Tu sesion no esta autorizada.", 401));
      }

      return Promise.resolve(mockAuthTokens);
    },
  };
}
