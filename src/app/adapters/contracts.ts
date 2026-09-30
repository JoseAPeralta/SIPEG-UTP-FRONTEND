import type {
  ActivityCatalog,
  AuthenticatedUser,
  AuthTokens,
  OperationsReadModel,
  RegistrationCatalog,
  RegistrationPayload,
  RegistrationResult,
} from "@/types/domain";

export type AuthCredentials = {
  email: string;
  password: string;
};

export type ActivityCatalogAccess = "administrative" | "public";

export type PasswordResetRequest = {
  email: string;
};

export type PasswordResetPayload = {
  newPassword: string;
  token: string;
};

export type PasswordChangeRequest = {
  currentPassword: string;
  newPassword: string;
};

/**
 * El refresh token no viaja en el cuerpo: el backend lo toma de la cookie
 * `HttpOnly` para identificar la sesion que debe conservar mientras revoca las
 * demas. Enviarlo aqui lo expondría a JavaScript sin ganar nada.
 */
export type PasswordChangePayload = PasswordChangeRequest;

/**
 * Editable subset of the authenticated profile. `unitId: null` selects the "Otro" option and makes
 * the backend force the global "Otros" career, so `careerId` is omitted in that case. Server
 * controlled attributes (email, global role, state and identifiers) are never part of this type.
 */
export type ProfileUpdateRequest = {
  careerId?: string;
  firstName?: string;
  lastName?: string;
  unitId?: string | null;
};

export type AuthAdapter = {
  changePassword: (accessToken: string, payload: PasswordChangePayload) => Promise<void>;
  loadCurrentUser: (accessToken: string) => Promise<AuthenticatedUser>;
  login: (credentials: AuthCredentials) => Promise<AuthTokens>;
  /**
   * Cierra la sesion. Sin argumentos: el refresh token viaja en una cookie
   * `HttpOnly` que el navegador envia sola y que este codigo no puede leer.
   */
  logout: () => Promise<void>;
  /**
   * Rota el refresh token de la cookie y devuelve un access token nuevo. Sin
   * argumentos por la misma razon, y ademas porque es lo que permite que una
   * pestana nueva se autentique sola: si hay cookie, hay sesion.
   */
  refresh: () => Promise<AuthTokens>;
  requestPasswordReset: (request: PasswordResetRequest) => Promise<void>;
  resetPassword: (payload: PasswordResetPayload) => Promise<void>;
  updateCurrentUser: (
    accessToken: string,
    request: ProfileUpdateRequest,
  ) => Promise<AuthenticatedUser>;
  verifyEmail: (token: string) => Promise<void>;
};

export type ActivityCatalogAdapter = {
  loadCatalog: (access: ActivityCatalogAccess) => Promise<ActivityCatalog>;
};

export type OperationsAdapter = {
  loadOperations: () => Promise<OperationsReadModel>;
};

export type RegistrationAdapter = {
  loadCatalog: () => Promise<RegistrationCatalog>;
  register: (payload: RegistrationPayload) => Promise<RegistrationResult>;
};

export type AppAdapters = {
  activityCatalog: ActivityCatalogAdapter;
  auth: AuthAdapter;
  operations: OperationsAdapter;
  registration: RegistrationAdapter;
};
