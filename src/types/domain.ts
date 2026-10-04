export type OrganizationalUnitType = "FACULTY" | "SUBDIRECTORATE";

export type OrganizationalUnitHead = {
  firstName: string;
  id: string;
  lastName: string;
};

export type OrganizationalUnit = {
  code: string;
  description: string | null;
  head: OrganizationalUnitHead | null;
  id: string;
  isActive: boolean;
  name: string;
  type: OrganizationalUnitType;
};

export type Career = {
  code: string;
  description?: string | null;
  id: string;
  name: string;
  unitId: string | null;
};

export type RegistrationCatalog = {
  careers: Career[];
  organizationalUnits: OrganizationalUnit[];
};

export type RegistrationPayload = {
  careerId?: string;
  email: string;
  firstName: string;
  identificationNumber: string;
  lastName: string;
  password: string;
  unitId?: string;
};

export type RegistrationResult = {
  userId: string;
};

export type GlobalRole = "ADMIN" | "USER";

export type OrganizationReference = {
  code: string;
  id: string;
  name: string;
};

export type AuthenticatedUser = {
  career: OrganizationReference | null;
  email: string;
  firstName: string;
  globalRole: GlobalRole;
  id: string;
  identificationNumber: string;
  lastName: string;
  unit: OrganizationReference | null;
};

/**
 * `refreshToken` ya no existe en el cliente: viaja en una cookie `HttpOnly` que el
 * navegador envia sola y que JavaScript no puede leer. Se conserva el campo de
 * expiracion porque no es secreto y sirve para saber cuanto vive la sesion.
 */
export type AuthTokens = {
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshTokenExpiresAt: string;
  tokenType: "Bearer";
};

/**
 * Why a session is no longer authenticated. It is a coarse, in-memory hint for the login screen:
 * the contract cannot confirm whether a credential expired, an account was deactivated or an email
 * is still unverified, so no reason asserts a specific cause.
 */
export type SessionEndReason = "expired" | "throttled" | "unavailable";

export type EventProgramStatus = "DRAFT" | "ACTIVE" | "COMPLETED" | "CANCELLED" | "ARCHIVED";

export type EventProgram = {
  bannerUrl: string | null;
  description: string | null;
  endDate: string | null;
  id: string;
  isDefault: boolean;
  label: string | null;
  name: string;
  organizationalUnitId: string;
  startDate: string | null;
  status: EventProgramStatus;
};

export type ActivityType =
  "WORKSHOP" | "SEMINAR" | "TALK" | "CONFERENCE" | "PANEL" | "COURSE" | "COMPETITION" | "OTHER";

export type ActivityStatus = "DRAFT" | "SCHEDULED" | "ONGOING" | "COMPLETED" | "CANCELLED";

export type ActivitySpeaker = {
  firstName: string;
  id: string;
  lastName: string;
};

export type Activity = {
  bannerUrl: string | null;
  cancelReason: string | null;
  capacity: number | null;
  checkedInCount: number;
  classroomId: string | null;
  date: string;
  description: string | null;
  endTime: string;
  enrolledCount: number;
  equipment: string[];
  eventProgramId: string;
  id: string;
  name: string;
  speakers: ActivitySpeaker[];
  startTime: string;
  status: ActivityStatus;
  type: ActivityType;
};

export type ClassroomType = "LABORATORY" | "CLASSROOM";

export type Classroom = {
  amenities: string[];
  building: string | null;
  capacity: number;
  floor: number | null;
  id: string;
  isActive: boolean;
  name: string;
  type: ClassroomType;
};

export type AttendanceMethod = "QR" | "MANUAL";

export type AttendanceRecord = {
  activityId: string;
  code: string;
  id: string;
  method: AttendanceMethod;
  present: boolean;
  userId: string;
};

export type CertificateStatus = "GENERATED" | "PENDING";

export type Certificate = {
  activityId: string;
  generatedAt: string;
  id: string;
  status: CertificateStatus;
  userId: string;
};

export type SpeakerProposal = {
  approximateDuration: string;
  content: string;
  email: string;
  eventProgramId: string;
  firstName: string;
  id: string;
  lastName: string;
  proposalTitle: string;
  submittedAt: string;
  talkType: ActivityType;
};

export type ReportMetric = {
  detail: string;
  id: string;
  label: string;
  trend: "down" | "stable" | "up";
  value: string;
};

export type ActivityCatalog = {
  activities: Activity[];
  classrooms: Classroom[];
  eventPrograms: EventProgram[];
  organizationalUnits: OrganizationalUnit[];
};

/**
 * Actividad tal como la publica el listado anonimo (`ActivityListItem`).
 *
 * No extiende `Activity` a proposito: el listado publico omite `equipment`,
 * `enrolledCount`, `checkedInCount` y `cancelReason`, que solo existen en el
 * detalle administrativo. Modelar la diferencia como dos tipos hace imposible
 * que la agenda publica dependa de un dato que el contrato no le da.
 *
 * `program` y `unit` vienen embebidos en el propio item, y `classroom` puede
 * ser `null`: la agenda se construye sin joins ni consultas adicionales.
 */
export type PublicActivity = {
  readonly bannerUrl: string | null;
  readonly capacity: number | null;
  readonly classroom: PublicClassroom | null;
  readonly date: string;
  readonly description: string | null;
  readonly endTime: string;
  readonly id: string;
  readonly name: string;
  readonly program: PublicEventProgram;
  readonly speakers: readonly ActivitySpeaker[];
  readonly startTime: string;
  readonly type: ActivityType;
  readonly unit: PublicOrganizationalUnit;
};

/**
 * Programa tal como lo embebe el listado publico (`ActivityProgramSummary`).
 *
 * `isDefault` no viene en el contrato; el read model lo deriva del nombre, que
 * el backend genera como `Programa de Eventos - <unidad>` para los programas
 * predeterminados.
 */
export type PublicEventProgram = {
  readonly id: string;
  readonly isDefault: boolean;
  readonly label: string | null;
  readonly name: string;
};

/** Aula tal como la embebe el listado publico (`ActivityClassroomSummary`). */
export type PublicClassroom = {
  readonly building: string | null;
  readonly id: string;
  readonly name: string;
};

/**
 * Unidad tal como la embebe el listado publico (`ActivityOrganizationalUnit`).
 *
 * Solo trae `id`, `name` y `type`. El codigo institucional no viene en el
 * contrato: lo aporta el registro de unidades del frontend, que es la unica
 * forma de colorear la agenda publica sin una segunda consulta.
 */
export type PublicOrganizationalUnit = {
  readonly backendId: string;
  readonly name: string;
  readonly type: OrganizationalUnitType;
};

/** Read model de la agenda publica, resuelto con una sola peticion. */
export type PublicActivityCatalog = {
  readonly activities: readonly PublicActivity[];
};

export type OperationsReadModel = {
  attendanceRecords: AttendanceRecord[];
  certificates: Certificate[];
  reportMetrics: ReportMetric[];
  speakerProposals: SpeakerProposal[];
};

export type WorkingContext =
  { id: string; kind: "eventProgram" } | { id: string; kind: "activity" };
