import type {
  ActivityCatalog,
  AuthenticatedUser,
  AuthTokens,
  Career,
  Classroom,
  ClassroomType,
  EventProgram,
  GlobalRole,
  OrganizationalUnit,
  OperationsReadModel,
  PublicActivityCatalog,
  RegistrationPayload,
  RegistrationResult,
} from "@/types/domain";
import type { OrganizationalUnitDetail } from "@/features/organizational-units/model/organizationalUnitDetail";
import type {
  Alert,
  AlertFilters,
  AlertsPage,
  MarkAllAlertsReadResult,
} from "@/features/alerts/model/alert";
import type {
  CreateOrganizationalUnitRequest,
  UpdateOrganizationalUnitRequest,
} from "@/features/organizational-units/model/organizationalUnitRequests";
import type {
  CreateCareerRequest,
  UpdateCareerRequest,
} from "@/features/careers/model/careerRequests";
import type {
  EventProgramListFilters,
  EventProgramListPage,
  EventProgramStatusFilter,
} from "@/features/event-programs/model/eventProgramList";
import type {
  CreateEventProgramRequest,
  UpdateEventProgramRequest,
} from "@/features/event-programs/model/eventProgramRequests";
import type { ClassroomDetail } from "@/features/classrooms/model/classroomDetail";
import type { AvailableClassroomsCriteria } from "@/features/classrooms/model/availableClassrooms";
import type { PublicActivityDetail } from "@/features/activity-catalog/model/publicActivityDetail";
import type {
  AdministrativeActivityDetail,
  AdministrativeActivityListPage,
  ActivityListFilters,
} from "@/features/activity-catalog/model/administrativeActivity";
import type {
  CancelActivityRequest,
  CreateActivityRequest,
  UpdateActivityRequest,
} from "@/features/activity-catalog/model/activityRequests";
import type { AdminUser, AdminUsersPage } from "@/features/users/model/adminUser";
import type {
  CreateAdminUserRequest,
  UpdateAdminUserRequest,
} from "@/features/users/model/userRequests";
import type { UserScope, UserScopeFilters } from "@/features/collaboration/model/userScopes";
import type {
  CollaborationScope,
  OwnPermissions,
} from "@/features/collaboration/model/ownPermissions";
import type {
  Collaborator,
  EffectiveCollaborator,
  AddCollaboratorRequest,
  ChangeCollaboratorRoleRequest,
  GrantPermissionRequest,
  RevokePermissionRequest,
} from "@/features/collaboration/model/collaborators";
import type {
  AddClassroomAvailabilityRequest,
  CreateClassroomRequest,
  UpdateClassroomRequest,
} from "@/features/classrooms/model/classroomRequests";

export type AuthCredentials = {
  email: string;
  password: string;
};

export type ActivityCatalogAccess = "administrative" | "public";

/**
 * Modalidad del catalogo compuesto. `active-programs` es la lectura historica: solo programas
 * ACTIVE. `all-programs` habilita el contexto de trabajo administrativo, que resuelve programas en
 * cualquier estado y referencias historicas, y el backend solo lo honra para ADMIN.
 */
export type ActivityCatalogMode = "active-programs" | "all-programs";

export type EventProgramsAccess = "administrative" | "public";

/** Lectura y ciclo de vida de programas, independientes del catálogo y de sus actividades. */
export type EventProgramsAdapter = {
  /**
   * Archiva un programa adicional. El contrato responde `409` si es la agenda permanente con la
   * unidad activa o si el programa tiene actividades publicadas sin terminar.
   */
  archiveEventProgram?: (programId: string) => Promise<EventProgram>;
  /**
   * Crea un programa adicional en estado borrador. El contrato exige `program:create`; sin scope de
   * colaboración, solo ADMIN queda autorizado y el backend conserva la autoridad final.
   */
  createEventProgram?: (request: CreateEventProgramRequest) => Promise<EventProgram>;
  loadEventPrograms: (
    access: EventProgramsAccess,
    status?: EventProgramStatusFilter,
  ) => Promise<EventProgram[]>;
  /**
   * Una pagina filtrada del listado administrativo. Solo la usa el panel tras el guard ADMIN: el
   * backend honra los estados no publicos unicamente para esa identidad y la clave de Query liga el
   * resultado al usuario.
   */
  loadEventProgramsPage?: (
    filters: EventProgramListFilters,
    page: number,
  ) => Promise<EventProgramListPage>;
  /**
   * Reactiva un programa adicional archivado. La agenda permanente responde `409`: su ciclo de vida
   * pertenece a la unidad.
   */
  reactivateEventProgram?: (programId: string) => Promise<EventProgram>;
  /**
   * Parche parcial con allowlist. La unica transicion de estado aceptada es `DRAFT -> ACTIVE`; las
   * fechas de la agenda permanente y la edicion de un archivado son rechazos del backend.
   */
  updateEventProgram?: (
    programId: string,
    request: UpdateEventProgramRequest,
  ) => Promise<EventProgram>;
};

/**
 * Filtros del listado de aulas, uno por parametro del contrato.
 *
 * `isActive` es triestado a proposito: el backend devuelve solo aulas activas cuando se omite, de
 * modo que la agenda publica no necesita decir nada, el panel puede pedir las inactivas y el filtro
 * "todas" obliga a recorrer las dos listas en lugar de fingir un parametro que el contrato no
 * acepta.
 */
export type ClassroomFilters = {
  amenity?: string;
  isActive?: "active" | "all" | "inactive";
  minCapacity?: number;
  type?: ClassroomType;
};

/**
 * Filtros del listado publico de unidades organizativas.
 *
 * `isActive` es triestado porque el contrato devuelve solo activas cuando se omite y separa
 * inactivas con `isActive=false`: "all" obliga a recorrer las dos listas y deduplicar.
 */
export type OrganizationalUnitFilters = {
  isActive?: "active" | "inactive" | "all";
};

export type OrganizationalUnitsAdapter = {
  createOrganizationalUnit?: (
    request: CreateOrganizationalUnitRequest,
  ) => Promise<OrganizationalUnitDetail>;
  deactivateOrganizationalUnit?: (unitId: string) => Promise<OrganizationalUnitDetail>;
  getOrganizationalUnit?: (unitId: string) => Promise<OrganizationalUnitDetail>;
  loadOrganizationalUnits: (filters?: OrganizationalUnitFilters) => Promise<OrganizationalUnit[]>;
  reactivateOrganizationalUnit?: (unitId: string) => Promise<OrganizationalUnitDetail>;
  updateOrganizationalUnit?: (
    unitId: string,
    request: UpdateOrganizationalUnitRequest,
  ) => Promise<OrganizationalUnitDetail>;
};

export type CareersAdapter = {
  createCareer?: (request: CreateCareerRequest) => Promise<Career>;
  deleteCareer?: (careerId: string) => Promise<void>;
  loadCareers: () => Promise<Career[]>;
  updateCareer?: (careerId: string, request: UpdateCareerRequest) => Promise<Career>;
};

export type ClassroomsAdapter = {
  addClassroomAmenity?: (classroomId: string, amenity: string) => Promise<ClassroomDetail>;
  addClassroomAvailability?: (
    classroomId: string,
    request: AddClassroomAvailabilityRequest,
  ) => Promise<ClassroomDetail>;
  createClassroom?: (request: CreateClassroomRequest) => Promise<ClassroomDetail>;
  getClassroom?: (classroomId: string) => Promise<ClassroomDetail>;
  loadAvailableClassrooms?: (criteria: AvailableClassroomsCriteria) => Promise<Classroom[]>;
  loadClassrooms: (filters?: ClassroomFilters) => Promise<Classroom[]>;
  removeClassroomAmenity?: (classroomId: string, amenity: string) => Promise<ClassroomDetail>;
  removeClassroomAvailability?: (
    classroomId: string,
    availabilityId: string,
  ) => Promise<ClassroomDetail>;
  updateClassroom?: (
    classroomId: string,
    request: UpdateClassroomRequest,
  ) => Promise<ClassroomDetail>;
};

export type PasswordResetRequest = {
  email: string;
};

export type PasswordResetPayload = {
  newPassword: string;
  token: string;
};

export type PasswordChangeRequest = {
  currentPassword: string;
  newPassword: string;
};

/**
 * El refresh token no viaja en el cuerpo: el backend lo toma de la cookie
 * `HttpOnly` para identificar la sesion que debe conservar mientras revoca las
 * demas. Enviarlo aqui lo expondría a JavaScript sin ganar nada.
 */
export type PasswordChangePayload = PasswordChangeRequest;

/**
 * Editable subset of the authenticated profile. `unitId: null` selects the "Otro" option and makes
 * the backend force the global "Otros" career, so `careerId` is omitted in that case. Server
 * controlled attributes (email, global role, state and identifiers) are never part of this type.
 */
export type ProfileUpdateRequest = {
  careerId?: string;
  firstName?: string;
  lastName?: string;
  unitId?: string | null;
};

export type AuthAdapter = {
  changePassword: (accessToken: string, payload: PasswordChangePayload) => Promise<void>;
  loadCurrentUser: (accessToken: string) => Promise<AuthenticatedUser>;
  login: (credentials: AuthCredentials) => Promise<AuthTokens>;
  /**
   * Cierra la sesion. Sin argumentos: el refresh token viaja en una cookie
   * `HttpOnly` que el navegador envia sola y que este codigo no puede leer.
   */
  logout: () => Promise<void>;
  /**
   * Rota el refresh token de la cookie y devuelve un access token nuevo. Sin
   * argumentos por la misma razon, y ademas porque es lo que permite que una
   * pestana nueva se autentique sola: si hay cookie, hay sesion.
   */
  refresh: () => Promise<AuthTokens>;
  requestPasswordReset: (request: PasswordResetRequest) => Promise<void>;
  resetPassword: (payload: PasswordResetPayload) => Promise<void>;
  updateCurrentUser: (
    accessToken: string,
    request: ProfileUpdateRequest,
  ) => Promise<AuthenticatedUser>;
  verifyEmail: (token: string) => Promise<void>;
};

/**
 * Catalogo compuesto: los programas con sus actividades y el detalle de cada actividad.
 *
 * Es una lectura exclusivamente administrativa: cada operacion viaja con Bearer y su clave de Query
 * se liga a la identidad. La agenda publica usa `PublicActivityCatalogAdapter`, que devuelve un
 * modelo distinto y no comparte esta clave. La modalidad `all-programs` resuelve programas en
 * cualquier estado y actividades DRAFT; el backend la honra solo para ADMIN.
 */
export type ActivityCatalogAdapter = {
  loadCatalog: (
    mode?: ActivityCatalogMode,
  ) => Promise<Pick<ActivityCatalog, "activities" | "eventPrograms">>;
};

/**
 * Agenda publica.
 *
 * Puerto separado de `ActivityCatalogAdapter` porque las dos readership no
 * comparten datos: el listado publico de actividades ya embebe aula, programa y
 * unidad, mientras que el catalogo administrativo necesita el detalle de cada
 * actividad. Compartir un puerto obligaba a la agenda publica a descargar el
 * detalle completo, que no usa.
 */
export type PublicActivityCatalogAdapter = {
  /**
   * Detalle publico de una actividad.
   *
   * Devuelve `null` cuando el recurso no existe o no es publico (el contrato
   * responde `404`). Un `DRAFT` recibido se rechaza como drift de la frontera
   * publica, nunca se expone. La peticion viaja sin `Authorization` y con
   * `credentials: "omit"`, aun con sesion iniciada.
   */
  getPublicActivity: (id: string) => Promise<PublicActivityDetail | null>;
  loadPublicActivities: () => Promise<PublicActivityCatalog>;
};

export type OperationsAdapter = {
  loadOperations: () => Promise<OperationsReadModel>;
};

/**
 * Filtros del listado administrativo de usuarios, uno por parametro del contrato. `isActive` es
 * opcional: omitirlo devuelve todos los estados, de modo que "todas" no necesita recorrer dos
 * listas como en aulas.
 */
export type AdminUserFilters = {
  careerId?: string;
  globalRole?: GlobalRole;
  isActive?: boolean;
  q?: string;
  unitId?: string;
};

/**
 * Listado administrativo de cuentas.
 *
 * `loadUsers` recorre todas las paginas y aplana los items; lo consumen los resumenes heredados
 * (`useCertificatesOverview`). `loadUsersPage` expone una pagina ya filtrada por el backend para la
 * pantalla de 3.2. La autorizacion final es del backend: este puerto solo transporta.
 */
export type UsersAdapter = {
  createUser?: (request: CreateAdminUserRequest) => Promise<AdminUser>;
  getUser?: (userId: string) => Promise<AdminUser>;
  loadUsers: () => Promise<AdminUser[]>;
  loadUsersPage?: (filters: AdminUserFilters, page: number) => Promise<AdminUsersPage>;
  updateUser?: (userId: string, request: UpdateAdminUserRequest) => Promise<AdminUser>;
};

export type RegistrationAdapter = {
  register: (payload: RegistrationPayload) => Promise<RegistrationResult>;
};

/**
 * Descubrimiento de los scopes accesibles del usuario autenticado.
 *
 * Una sola operacion paginada de descubrimiento reemplaza cualquier N+1 sobre el catalogo publico;
 * el backend decide que scopes son accesibles, incluidos los no publicos.
 */
export type UserScopesAdapter = {
  loadUserScopes: (filters?: UserScopeFilters) => Promise<UserScope[]>;
};

/**
 * Bandeja privada de alertas.
 *
 * Ninguna operacion acepta destinatario: el backend toma la identidad del token. `loadAlertsPage`
 * expone una pagina filtrada para la bandeja; recorrer todo el historial no tiene caso de uso.
 * `markAlertRead` es idempotente y comparte el `404` entre una alerta inexistente y una ajena.
 */
export type AlertsAdapter = {
  loadAlertsPage: (filters: AlertFilters, page: number) => Promise<AlertsPage>;
  markAlertRead: (id: string) => Promise<Alert>;
  markAllAlertsRead: () => Promise<MarkAllAlertsReadResult>;
};

/**
 * Administracion de actividades por programa.
 *
 * Puerto privado: cada operacion viaja con Bearer y sus claves de Query se ligan a la identidad.
 * `loadProgramActivitiesPage` expone una pagina filtrada (`status=ALL` lo honra el backend solo
 * para identidades autorizadas) y `getActivity` resuelve el detalle con equipamiento y contadores,
 * que el listado omite. La creacion nace como borrador y el programa propietario es inmutable.
 */
export type ActivitiesAdapter = {
  cancelActivity: (
    activityId: string,
    request: CancelActivityRequest,
  ) => Promise<AdministrativeActivityDetail>;
  createActivity: (request: CreateActivityRequest) => Promise<AdministrativeActivityDetail>;
  /**
   * Elimina un borrador de un programa activo. Sin cuerpo; el contrato responde `204`. El backend
   * verifica la retencion (sin asistencia ni alertas) y responde `409` si no se cumple.
   */
  deleteActivity: (activityId: string) => Promise<void>;
  getActivity: (activityId: string) => Promise<AdministrativeActivityDetail>;
  loadProgramActivitiesPage: (
    programId: string,
    filters: ActivityListFilters,
    page: number,
  ) => Promise<AdministrativeActivityListPage>;
  updateActivity: (
    activityId: string,
    request: UpdateActivityRequest,
  ) => Promise<AdministrativeActivityDetail>;
};

export type AppAdapters = {
  activities: ActivitiesAdapter;
  alerts: AlertsAdapter;
  collaborators: CollaboratorsAdapter;
  ownPermissions: OwnPermissionsAdapter;
  activityCatalog: ActivityCatalogAdapter;
  auth: AuthAdapter;
  careers: CareersAdapter;
  classrooms: ClassroomsAdapter;
  eventPrograms: EventProgramsAdapter;
  organizationalUnits: OrganizationalUnitsAdapter;
  operations: OperationsAdapter;
  publicActivityCatalog: PublicActivityCatalogAdapter;
  registration: RegistrationAdapter;
  users: UsersAdapter;
  userScopes: UserScopesAdapter;
};

export type OwnPermissionsAdapter = {
  loadOwnPermissions: (scope: CollaborationScope) => Promise<OwnPermissions>;
};

export type CollaboratorsAdapter = {
  loadCollaborators: (scope: CollaborationScope) => Promise<EffectiveCollaborator[]>;
  addCollaborator: (
    scope: CollaborationScope,
    input: AddCollaboratorRequest,
  ) => Promise<Collaborator>;
  changeCollaboratorRole: (
    scope: CollaborationScope,
    userId: string,
    input: ChangeCollaboratorRoleRequest,
  ) => Promise<Collaborator>;
  /**
   * Crea o reemplaza una concesion directa local. La respuesta trae las concesiones locales del
   * colaborador, no su procedencia efectiva: el hook relee el listado en lugar de insertarla.
   */
  grantPermission: (
    scope: CollaborationScope,
    input: GrantPermissionRequest,
  ) => Promise<Collaborator>;
  removeCollaborator: (scope: CollaborationScope, userId: string) => Promise<void>;
  revokePermission: (scope: CollaborationScope, input: RevokePermissionRequest) => Promise<void>;
};
