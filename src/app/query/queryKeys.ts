export const queryKeys = {
  activityCatalog: ["activity-catalog"],
  operations: ["operations"],
} as const;

export const PERSISTED_QUERY_KEY_ROOTS: readonly string[] = [queryKeys.activityCatalog[0]];

export function isPersistedQueryKey(queryKey: readonly unknown[]): boolean {
  return PERSISTED_QUERY_KEY_ROOTS.includes(String(queryKey[0]));
}
