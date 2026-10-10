export const QUERY_CACHE_STORAGE_KEY = "sipeg-query-cache";
export const QUERY_CACHE_SCHEMA_VERSION = "4";
export const QUERY_CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;
export const QUERY_CACHE_THROTTLE_MS = 1000;

export type QueryPersistenceEnvironment = {
  readonly PROD?: boolean;
  readonly VITE_APP_VERSION?: string;
  readonly VITE_QUERY_PERSISTENCE?: string;
};

export function resolveQueryPersistence(
  environment: QueryPersistenceEnvironment = import.meta.env,
): boolean {
  return environment.VITE_QUERY_PERSISTENCE?.trim().toLowerCase() === "on";
}

export function resolvePersistenceBuster(
  environment: QueryPersistenceEnvironment = import.meta.env,
): string {
  const configuredVersion = environment.VITE_APP_VERSION?.trim();

  if (configuredVersion) {
    return `${QUERY_CACHE_SCHEMA_VERSION}:${configuredVersion}`;
  }

  return `${QUERY_CACHE_SCHEMA_VERSION}:dev`;
}

export function clearPersistedQueryCache(storage: Storage = window.localStorage): void {
  storage.removeItem(QUERY_CACHE_STORAGE_KEY);
}
