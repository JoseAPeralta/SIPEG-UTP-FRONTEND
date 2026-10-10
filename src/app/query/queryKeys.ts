import type { AdminUserFilters, ClassroomFilters } from "@/app/adapters/contracts";
import type { EventProgramListFilters } from "@/features/event-programs/model/eventProgramList";
import type { AlertFilters } from "@/features/alerts/model/alert";
import type { AvailableClassroomsCriteria } from "@/features/classrooms/model/availableClassrooms";
import type { UserScopeFilters } from "@/features/collaboration/model/userScopes";
import type { CollaborationScope } from "@/features/collaboration/model/ownPermissions";
import type { ActivityListFilters } from "@/features/activity-catalog/model/administrativeActivity";

export const queryKeys = {
  /**
   * Bandeja privada de alertas. Se liga siempre a la identidad, nunca al token, y jamas se agrega a
   * `PERSISTED_QUERY_KEY_ROOTS`: una alerta es dato privado con vencimiento, no referencia offline.
   */
  alertsPage: (userId: string, filters: AlertFilters, page: number) =>
    ["alerts", userId, filters, page] as const,
  /** Prefijo por identidad que alcanza todas las paginas y filtros de la bandeja. */
  alertsScope: (userId: string) => ["alerts", userId] as const,
  ownPermissions: (userId: string, scope: CollaborationScope) =>
    ["own-permissions", userId, scope.type, scope.id] as const,
  ownPermissionsScope: (userId: string) => ["own-permissions", userId] as const,
  collaborators: (userId: string, scope: CollaborationScope) =>
    ["collaborators", userId, scope.type, scope.id] as const,
  collaboratorsScope: (userId: string) => ["collaborators", userId] as const,
  /**
   * Administracion de actividades: pagina privada por identidad, programa, filtros y pagina.
   * `activityAdministrationScope` alcanza todas las paginas y filtros de la identidad.
   */
  activityAdministrationPage: (
    userId: string,
    programId: string,
    filters: ActivityListFilters,
    page: number,
  ) => ["activity-administration", userId, programId, filters, page] as const,
  activityAdministrationScope: (userId: string) => ["activity-administration", userId] as const,
  /**
   * Prefijo por identidad y programa que alcanza todas las paginas y filtros del programa
   * propietario; una mutacion de actividad no invalida las paginas de otro programa.
   */
  activityAdministrationProgramScope: (userId: string, programId: string) =>
    ["activity-administration", userId, programId] as const,
  /**
   * Detalle privado por identidad y actividad; separado del listado porque una edicion debe
   * refrescar el detalle sin descartar las paginas cacheadas.
   */
  activityAdministrationDetail: (userId: string, activityId: string) =>
    ["activity-administration-detail", userId, activityId] as const,
  activityAdministrationDetailScope: (userId: string) =>
    ["activity-administration-detail", userId] as const,
  administrativeActivityCatalog: (userId: string) =>
    ["administrative-activity-catalog", userId] as const,
  /**
   * Catalogo administrativo completo (`all-programs`). El prefijo de dos segmentos
   * `administrativeActivityCatalog(userId)` alcanza esta clave al invalidar, de modo que las
   * mutaciones existentes siguen cubriendo ambas modalidades.
   */
  administrativeWorkingContextCatalog: (userId: string) =>
    ["administrative-activity-catalog", userId, "all-programs"] as const,
  administrativeCareers: (userId: string) => ["administrative-careers", userId] as const,
  /** Programas administrativos independientes del catálogo; privados y nunca persistidos. */
  administrativeEventPrograms: (userId: string) =>
    ["administrative-event-programs", userId] as const,
  /**
   * Programas en cualquier estado, incluidos borradores y archivados. La usa la administracion de
   * actividades para resolver el programa propietario; el prefijo de dos segmentos que invalidan
   * las mutaciones de programas ya la alcanza.
   */
  administrativeEventProgramsAll: (userId: string) =>
    ["administrative-event-programs", userId, "ALL"] as const,
  /** Una pagina filtrada del listado administrativo; se separa por filtros y pagina. */
  administrativeEventProgramsPage: (
    userId: string,
    filters: EventProgramListFilters,
    page: number,
  ) => ["administrative-event-programs", userId, filters, page] as const,
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
  /**
   * Unidades administrativas en cualquier estado. El prefijo de dos segmentos
   * `administrativeOrganizationalUnits(userId)` la alcanza al invalidar, asi que las mutaciones
   * existentes invalidan tambien la modalidad completa.
   */
  administrativeOrganizationalUnitsAll: (userId: string) =>
    ["administrative-organizational-units", userId, "all"] as const,
  administrativeUserDetail: (userId: string, targetUserId: string) =>
    ["administrative-user-detail", userId, targetUserId] as const,
  /** Listado administrativo aplanado (todas las paginas) que consumen los resumenes heredados. */
  administrativeUsers: (userId: string) => ["administrative-users", userId] as const,
  /** Una pagina filtrada del listado administrativo, administrada por la pantalla de 3.2. */
  administrativeUsersPage: (userId: string, filters: AdminUserFilters, page: number) =>
    ["administrative-users", userId, filters, page] as const,
  /** Prefijo por identidad que alcanza el listado aplanado y todas las paginas filtradas. */
  administrativeUsersScope: (userId: string) => ["administrative-users", userId] as const,
  availableClassrooms: (criteria: AvailableClassroomsCriteria | null) =>
    ["available-classrooms", criteria] as const,
  /** Raiz que alcanza toda consulta de disponibilidad, cualquiera sea su criterio. */
  availableClassroomsRoot: ["available-classrooms"],
  operations: (userId: string) => ["operations", userId] as const,
  publicActivityCatalog: ["public-activity-catalog"],
  /**
   * Detalle publico por actividad. Separado del listado porque una actividad
   * puede cancelarse o completarse mientras la agenda sigue vigente; jamas se
   * persiste ni incluye credenciales.
   */
  publicActivityDetail: (activityId: string) => ["public-activity-detail", activityId] as const,
  publicCareers: ["public-careers"],
  publicClassroomDetail: (classroomId: string) => ["public-classroom-detail", classroomId] as const,
  publicClassrooms: ["public-classrooms"],
  publicOrganizationalUnitDetail: (unitId: string) =>
    ["public-organizational-unit-detail", unitId] as const,
  /** Raiz que alcanza todos los detalles publicos de unidad, usada por las mutaciones de carrera. */
  publicOrganizationalUnitDetails: ["public-organizational-unit-detail"],
  publicOrganizationalUnits: ["public-organizational-units"],
  /** Scopes accesibles del usuario, privados y ligados a la identidad; nunca se persisten. */
  userScopes: (userId: string, filters: UserScopeFilters = {}) =>
    ["user-scopes", userId, filters] as const,
  /** Prefijo por identidad que alcanza todos los filtros de descubrimiento. */
  userScopesScope: (userId: string) => ["user-scopes", userId] as const,
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
