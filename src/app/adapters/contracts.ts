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

export type PasswordChangePayload = PasswordChangeRequest & {
  refreshToken: string;
};

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
  logout: (refreshToken: string) => Promise<void>;
  refresh: (refreshToken: string) => Promise<AuthTokens>;
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
