export const queryKeys = {
  administrativeActivityCatalog: (userId: string) =>
    ["administrative-activity-catalog", userId] as const,
  administrativeCareers: (userId: string) => ["administrative-careers", userId] as const,
  administrativeClassrooms: (userId: string) => ["administrative-classrooms", userId] as const,
  administrativeOrganizationalUnits: (userId: string) =>
    ["administrative-organizational-units", userId] as const,
  operations: (userId: string) => ["operations", userId] as const,
  publicActivityCatalog: ["public-activity-catalog"],
  publicCareers: ["public-careers"],
  publicClassrooms: ["public-classrooms"],
  publicOrganizationalUnits: ["public-organizational-units"],
} as const;

/**
 * Public roots are dehydrated because they are anonymous reference data required offline. Careers
 * are deliberately absent: they were never persisted, and registration already refetches them.
 * Administrative roots are identity-scoped and must never reach localStorage.
 */
export const PERSISTED_QUERY_KEY_ROOTS: readonly string[] = [
  queryKeys.publicActivityCatalog[0],
  queryKeys.publicClassrooms[0],
  queryKeys.publicOrganizationalUnits[0],
];

export function isPersistedQueryKey(queryKey: readonly unknown[]): boolean {
  return PERSISTED_QUERY_KEY_ROOTS.includes(String(queryKey[0]));
}
