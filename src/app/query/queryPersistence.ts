import type { PersistQueryClientOptions, Persister } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";

import { isPersistedQueryKey } from "./queryKeys";

export const QUERY_CACHE_STORAGE_KEY = "sipeg-query-cache";
export const QUERY_CACHE_SCHEMA_VERSION = "1";
export const QUERY_CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;
export const QUERY_CACHE_THROTTLE_MS = 1000;

export type QueryPersistenceEnvironment = {
  readonly PROD?: boolean;
  readonly VITE_APP_VERSION?: string;
  readonly VITE_QUERY_PERSISTENCE?: string;
};

export type QueryPersistenceOptions = Omit<PersistQueryClientOptions, "queryClient">;

export function resolveQueryPersistence(
  environment: QueryPersistenceEnvironment = import.meta.env,
): boolean {
  return environment.VITE_QUERY_PERSISTENCE?.trim().toLowerCase() === "on";
}

function resolvePersistenceBuster(
  environment: QueryPersistenceEnvironment = import.meta.env,
): string {
  const configuredVersion = environment.VITE_APP_VERSION?.trim();

  if (configuredVersion) {
    return `${QUERY_CACHE_SCHEMA_VERSION}:${configuredVersion}`;
  }

  return `${QUERY_CACHE_SCHEMA_VERSION}:dev`;
}

export function createQueryPersister(
  storage: Storage = window.localStorage,
  throttleTime: number = QUERY_CACHE_THROTTLE_MS,
): Persister {
  return createSyncStoragePersister({
    key: QUERY_CACHE_STORAGE_KEY,
    storage,
    throttleTime,
  });
}

export function createPersistenceOptions(
  persister: Persister,
  environment: QueryPersistenceEnvironment = import.meta.env,
): QueryPersistenceOptions {
  return {
    buster: resolvePersistenceBuster(environment),
    dehydrateOptions: {
      shouldDehydrateQuery: (query) =>
        query.state.status === "success" && isPersistedQueryKey(query.queryKey),
    },
    maxAge: QUERY_CACHE_MAX_AGE_MS,
    persister,
  };
}

export function clearPersistedQueryCache(storage: Storage = window.localStorage): void {
  storage.removeItem(QUERY_CACHE_STORAGE_KEY);
}
