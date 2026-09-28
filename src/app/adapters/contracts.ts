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

export type AuthAdapter = {
  loadCurrentUser: (accessToken: string) => Promise<AuthenticatedUser>;
  login: (credentials: AuthCredentials) => Promise<AuthTokens>;
  logout: (refreshToken: string) => Promise<void>;
  refresh: (refreshToken: string) => Promise<AuthTokens>;
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
