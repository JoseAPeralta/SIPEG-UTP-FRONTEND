import type {
  ActivityCatalog,
  AuthenticatedUser,
  AuthTokens,
  OperationsReadModel,
} from "@/types/domain";

export type AuthCredentials = {
  email: string;
  password: string;
};

export type AuthAdapter = {
  loadCurrentUser: (accessToken: string) => Promise<AuthenticatedUser>;
  login: (credentials: AuthCredentials) => Promise<AuthTokens>;
  logout: (refreshToken: string) => Promise<void>;
  refresh: (refreshToken: string) => Promise<AuthTokens>;
};

export type ActivityCatalogAdapter = {
  loadCatalog: () => Promise<ActivityCatalog>;
};

export type OperationsAdapter = {
  loadOperations: () => Promise<OperationsReadModel>;
};

export type AppAdapters = {
  activityCatalog: ActivityCatalogAdapter;
  auth: AuthAdapter;
  operations: OperationsAdapter;
};
