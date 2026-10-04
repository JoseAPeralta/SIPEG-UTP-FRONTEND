import type { ClassroomFilters } from "@/app/adapters/contracts";
import type { AvailableClassroomsCriteria } from "@/features/classrooms/model/availableClassrooms";

export const queryKeys = {
  administrativeActivityCatalog: (userId: string) =>
    ["administrative-activity-catalog", userId] as const,
  administrativeCareers: (userId: string) => ["administrative-careers", userId] as const,
  administrativeClassroomDetail: (userId: string, classroomId: string) =>
    ["administrative-classroom-detail", userId, classroomId] as const,
  administrativeClassrooms: (userId: string, filters: ClassroomFilters = {}) =>
    ["administrative-classrooms", userId, filters] as const,
  /**
   * Prefijo por identidad que alcanza todos los listados administrativos filtrados. La forma con
   * `filters` por defecto no sirve como raiz: el objeto `{}` no coincide con otro filtro.
   */
  administrativeClassroomsScope: (userId: string) => ["administrative-classrooms", userId] as const,
  administrativeOrganizationalUnitDetail: (userId: string, unitId: string) =>
    ["administrative-organizational-unit-detail", userId, unitId] as const,
  /** Prefijo por identidad que alcanza todos los detalles administrativos de unidad. */
  administrativeOrganizationalUnitDetails: (userId: string) =>
    ["administrative-organizational-unit-detail", userId] as const,
  administrativeOrganizationalUnits: (userId: string) =>
    ["administrative-organizational-units", userId] as const,
  availableClassrooms: (criteria: AvailableClassroomsCriteria | null) =>
    ["available-classrooms", criteria] as const,
  /** Raiz que alcanza toda consulta de disponibilidad, cualquiera sea su criterio. */
  availableClassroomsRoot: ["available-classrooms"],
  operations: (userId: string) => ["operations", userId] as const,
  publicActivityCatalog: ["public-activity-catalog"],
  publicCareers: ["public-careers"],
  publicClassroomDetail: (classroomId: string) => ["public-classroom-detail", classroomId] as const,
  publicClassrooms: ["public-classrooms"],
  publicOrganizationalUnitDetail: (unitId: string) =>
    ["public-organizational-unit-detail", unitId] as const,
  /** Raiz que alcanza todos los detalles publicos de unidad, usada por las mutaciones de carrera. */
  publicOrganizationalUnitDetails: ["public-organizational-unit-detail"],
  publicOrganizationalUnits: ["public-organizational-units"],
} as const;

/**
 * Public roots are dehydrated because they are anonymous reference data required offline. Careers
 * are deliberately absent: they were never persisted, and registration already refetches them.
 * Classroom details are absent too: the offline agenda never reads a single classroom, and the
 * weekly availability would become stale data on disk for no benefit.
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
