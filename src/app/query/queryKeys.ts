export const queryKeys = {
  administrativeActivityCatalog: (userId: string) =>
    ["administrative-activity-catalog", userId] as const,
  operations: (userId: string) => ["operations", userId] as const,
  publicActivityCatalog: ["public-activity-catalog"],
  registrationCatalog: ["registration-catalog"],
} as const;

export const PERSISTED_QUERY_KEY_ROOTS: readonly string[] = [queryKeys.publicActivityCatalog[0]];

export function isPersistedQueryKey(queryKey: readonly unknown[]): boolean {
  return PERSISTED_QUERY_KEY_ROOTS.includes(String(queryKey[0]));
}
