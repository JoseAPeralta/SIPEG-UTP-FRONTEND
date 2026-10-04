import { dehydrate, type Query } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";

import { createQueryClient } from "./queryClient";
import { isPersistedQueryKey, queryKeys } from "./queryKeys";
import {
  clearPersistedQueryCache,
  createPersistenceOptions,
  createQueryPersister,
  QUERY_CACHE_MAX_AGE_MS,
  QUERY_CACHE_SCHEMA_VERSION,
  QUERY_CACHE_STORAGE_KEY,
  resolveQueryPersistence,
} from "./queryPersistence";

function createMemoryStorage(): Storage {
  const values = new Map<string, string>();

  return {
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    get length() {
      return values.size;
    },
    removeItem: (key) => {
      values.delete(key);
    },
    setItem: (key, value) => {
      values.set(key, value);
    },
  };
}

function fakeQuery(queryKey: readonly unknown[], status: string): Query {
  return { queryKey, state: { status } } as unknown as Query;
}

describe("resolveQueryPersistence", () => {
  it("should only enable persistence with an explicit on flag", () => {
    expect(resolveQueryPersistence({ VITE_QUERY_PERSISTENCE: "on" })).toBe(true);
    expect(resolveQueryPersistence({ VITE_QUERY_PERSISTENCE: " ON " })).toBe(true);
    expect(resolveQueryPersistence({ VITE_QUERY_PERSISTENCE: "off" })).toBe(false);
    expect(resolveQueryPersistence({})).toBe(false);
  });
});

describe("isPersistedQueryKey", () => {
  it("should persist only public catalog roots", () => {
    expect(isPersistedQueryKey(queryKeys.publicActivityCatalog)).toBe(true);
    expect(isPersistedQueryKey(queryKeys.publicOrganizationalUnits)).toBe(true);
    expect(isPersistedQueryKey(queryKeys.publicClassrooms)).toBe(true);
  });

  it("should never persist identity-scoped or unregistered roots", () => {
    expect(isPersistedQueryKey(queryKeys.publicCareers)).toBe(false);
    expect(isPersistedQueryKey(queryKeys.administrativeActivityCatalog("user-1"))).toBe(false);
    expect(isPersistedQueryKey(queryKeys.administrativeCareers("user-1"))).toBe(false);
    expect(isPersistedQueryKey(queryKeys.administrativeClassrooms("user-1"))).toBe(false);
    expect(isPersistedQueryKey(queryKeys.administrativeOrganizationalUnits("user-1"))).toBe(false);
    expect(isPersistedQueryKey(queryKeys.administrativeUsers("user-1"))).toBe(false);
    expect(isPersistedQueryKey(queryKeys.operations("user-1"))).toBe(false);
    expect(
      isPersistedQueryKey(
        queryKeys.availableClassrooms({
          date: "2026-08-24",
          endTime: "11:00",
          startTime: "09:00",
        }),
      ),
    ).toBe(false);
    expect(isPersistedQueryKey(["unknown"])).toBe(false);
  });
});

describe("createPersistenceOptions", () => {
  it("should dehydrate only successful persisted queries", () => {
    const persister = createQueryPersister(createMemoryStorage());
    const options = createPersistenceOptions(persister, { VITE_APP_VERSION: "2026.09.25" });
    const shouldDehydrate = options.dehydrateOptions?.shouldDehydrateQuery;

    expect(shouldDehydrate?.(fakeQuery(queryKeys.publicActivityCatalog, "success"))).toBe(true);
    expect(shouldDehydrate?.(fakeQuery(queryKeys.publicOrganizationalUnits, "success"))).toBe(true);
    expect(shouldDehydrate?.(fakeQuery(queryKeys.publicClassrooms, "success"))).toBe(true);
    expect(shouldDehydrate?.(fakeQuery(queryKeys.publicCareers, "success"))).toBe(false);
    expect(
      shouldDehydrate?.(fakeQuery(queryKeys.administrativeActivityCatalog("user-1"), "success")),
    ).toBe(false);
    expect(shouldDehydrate?.(fakeQuery(queryKeys.operations("user-1"), "success"))).toBe(false);
    expect(shouldDehydrate?.(fakeQuery(queryKeys.publicActivityCatalog, "pending"))).toBe(false);
    expect(options.buster).toBe(`${QUERY_CACHE_SCHEMA_VERSION}:2026.09.25`);
    expect(options.maxAge).toBe(QUERY_CACHE_MAX_AGE_MS);
  });

  it("should fall back to a development buster without a version", () => {
    const persister = createQueryPersister(createMemoryStorage());

    expect(createPersistenceOptions(persister, {}).buster).toBe(
      `${QUERY_CACHE_SCHEMA_VERSION}:dev`,
    );
  });
});

describe("queryCacheStorage", () => {
  it("should persist and restore the dehydrated cache", async () => {
    const storage = createMemoryStorage();
    const persister = createQueryPersister(storage, 0);
    const client = createQueryClient();

    client.setQueryData(queryKeys.publicActivityCatalog, { restored: true });
    await persister.persistClient({
      buster: "dev",
      clientState: dehydrate(client),
      timestamp: Date.now(),
    });

    await vi.waitFor(() => {
      expect(storage.getItem(QUERY_CACHE_STORAGE_KEY)).not.toBeNull();
    });

    const restored = await persister.restoreClient();

    expect(restored?.clientState.queries).toHaveLength(1);
  });

  it("should remove the persisted cache", () => {
    const storage = createMemoryStorage();

    storage.setItem(QUERY_CACHE_STORAGE_KEY, "{}");
    clearPersistedQueryCache(storage);

    expect(storage.getItem(QUERY_CACHE_STORAGE_KEY)).toBeNull();
  });
});
