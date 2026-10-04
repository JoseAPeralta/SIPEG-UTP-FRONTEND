import type { PersistQueryClientOptions, Persister } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";

import { isPersistedQueryKey } from "./queryKeys";
import {
  QUERY_CACHE_MAX_AGE_MS,
  QUERY_CACHE_STORAGE_KEY,
  QUERY_CACHE_THROTTLE_MS,
  resolvePersistenceBuster,
  type QueryPersistenceEnvironment,
} from "./queryPersistenceConfig";

export {
  clearPersistedQueryCache,
  QUERY_CACHE_MAX_AGE_MS,
  QUERY_CACHE_SCHEMA_VERSION,
  QUERY_CACHE_STORAGE_KEY,
  QUERY_CACHE_THROTTLE_MS,
  resolveQueryPersistence,
} from "./queryPersistenceConfig";
export type { QueryPersistenceEnvironment } from "./queryPersistenceConfig";

export type QueryPersistenceOptions = Omit<PersistQueryClientOptions, "queryClient">;

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
