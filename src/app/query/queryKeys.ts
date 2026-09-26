export const queryKeys = {
  administrativeActivityCatalog: ["administrative-activity-catalog"],
  operations: ["operations"],
  publicActivityCatalog: ["public-activity-catalog"],
} as const;

export const PERSISTED_QUERY_KEY_ROOTS: readonly string[] = [queryKeys.publicActivityCatalog[0]];

export function isPersistedQueryKey(queryKey: readonly unknown[]): boolean {
  return PERSISTED_QUERY_KEY_ROOTS.includes(String(queryKey[0]));
}
