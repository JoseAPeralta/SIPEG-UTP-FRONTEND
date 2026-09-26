import type { AuthenticatedUser, AuthTokens } from "@/types/domain";

export const mockAuthenticatedUser: AuthenticatedUser = {
  career: {
    code: "SOFTWARE",
    id: "software",
    name: "Desarrollo de Software",
  },
  email: "mariana.rodriguez@example.edu",
  firstName: "Mariana",
  globalRole: "ADMIN",
  id: "user-1",
  identificationNumber: "8-000-0001",
  lastName: "Rodriguez",
  unit: {
    code: "FISC",
    id: "fisc",
    name: "Facultad de Ingenieria de Sistemas Computacionales",
  },
};

export const mockAuthTokens: AuthTokens = {
  accessToken: "mock-access-token",
  accessTokenExpiresAt: "2099-01-01T00:00:00.000Z",
  refreshToken: "mock-refresh-token",
  refreshTokenExpiresAt: "2099-02-01T00:00:00.000Z",
  tokenType: "Bearer",
};
