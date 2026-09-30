import type {
  Activity,
  ActivityCatalog,
  AuthenticatedUser,
  AuthTokens,
  AttendanceRecord,
  Career,
  Certificate,
  Classroom,
  EventProgram,
  OperationsReadModel,
  OrganizationalUnit,
  SpeakerProposal,
  User,
} from "@/types/domain";

export function createAuthenticatedUser(
  overrides: Partial<AuthenticatedUser> = {},
): AuthenticatedUser {
  return {
    career: null,
    email: "admin@example.edu",
    firstName: "Mariana",
    globalRole: "ADMIN",
    id: "user-1",
    identificationNumber: "8-123-456",
    lastName: "Rodriguez",
    unit: null,
    ...overrides,
  };
}

export function createAuthTokens(overrides: Partial<AuthTokens> = {}): AuthTokens {
  return {
    accessToken: "access-token",
    accessTokenExpiresAt: "2099-01-01T00:00:00.000Z",
    refreshTokenExpiresAt: "2099-02-01T00:00:00.000Z",
    tokenType: "Bearer",
    ...overrides,
  };
}

export function createUser(overrides: Partial<User> = {}): User {
  return {
    careerId: null,
    email: "admin@example.edu",
    firstName: "Mariana",
    globalRole: "ADMIN",
    id: "user-1",
    isActive: true,
    lastName: "Rodriguez",
    unitId: null,
    ...overrides,
  };
}

export function createCareer(overrides: Partial<Career> = {}): Career {
  return {
    code: "SOFTWARE",
    id: "software",
    name: "Desarrollo de Software",
    unitId: "fisc",
    ...overrides,
  };
}

export function createAttendanceRecord(
  overrides: Partial<AttendanceRecord> = {},
): AttendanceRecord {
  return {
    activityId: "activity-1",
    code: "ATT-0001",
    id: "attendance-1",
    method: "QR",
    present: true,
    userId: "user-1",
    ...overrides,
  };
}

export function createCertificate(overrides: Partial<Certificate> = {}): Certificate {
  return {
    activityId: "activity-1",
    generatedAt: "2026-06-15T10:00:00.000Z",
    id: "certificate-1",
    status: "GENERATED",
    userId: "user-1",
    ...overrides,
  };
}

export function createSpeakerProposal(overrides: Partial<SpeakerProposal> = {}): SpeakerProposal {
  return {
    approximateDuration: "45 minutos",
    content: "Propuesta de prueba",
    email: "ponente@example.edu",
    eventProgramId: "program-1",
    firstName: "Ana",
    id: "speaker-proposal-1",
    lastName: "Perez",
    proposalTitle: "Charla de prueba",
    submittedAt: "2026-05-01T10:00:00.000Z",
    talkType: "TALK",
    ...overrides,
  };
}

export function createOperationsReadModel(
  overrides: Partial<OperationsReadModel> = {},
): OperationsReadModel {
  return {
    attendanceRecords: [],
    careers: [],
    certificates: [],
    reportMetrics: [],
    speakerProposals: [],
    users: [createUser()],
    ...overrides,
  };
}

export function createOrganizationalUnit(
  overrides: Partial<OrganizationalUnit> = {},
): OrganizationalUnit {
  return {
    code: "FIC",
    description: null,
    head: null,
    id: "fic",
    isActive: true,
    name: "Facultad de Ingenieria Civil",
    type: "FACULTY",
    ...overrides,
  };
}

export function createEventProgram(overrides: Partial<EventProgram> = {}): EventProgram {
  return {
    bannerUrl: null,
    description: null,
    endDate: "2026-06-19",
    id: "program-1",
    isDefault: false,
    label: "Semana de innovacion",
    name: "Semana de Innovacion Academica",
    organizationalUnitId: "fic",
    startDate: "2026-06-15",
    status: "ACTIVE",
    ...overrides,
  };
}

export function createClassroom(overrides: Partial<Classroom> = {}): Classroom {
  return {
    amenities: ["projector"],
    building: "Edificio de Aulas",
    capacity: 60,
    floor: 1,
    id: "classroom-1",
    isActive: true,
    name: "Aula 101",
    type: "CLASSROOM",
    ...overrides,
  };
}

export function createActivity(overrides: Partial<Activity> = {}): Activity {
  return {
    bannerUrl: null,
    cancelReason: null,
    capacity: 40,
    checkedInCount: 0,
    classroomId: "classroom-1",
    date: "2026-06-15",
    description: "Actividad de prueba",
    endTime: "11:00",
    enrolledCount: 10,
    equipment: ["Proyector"],
    eventProgramId: "program-1",
    id: "activity-1",
    name: "Actividad de prueba",
    speakers: [],
    startTime: "09:00",
    status: "SCHEDULED",
    type: "TALK",
    ...overrides,
  };
}

export function createCatalog(overrides: Partial<ActivityCatalog> = {}): ActivityCatalog {
  const organizationalUnits = overrides.organizationalUnits ?? [createOrganizationalUnit()];
  const eventPrograms = overrides.eventPrograms ?? [createEventProgram()];
  const classrooms = overrides.classrooms ?? [createClassroom()];
  const activities = overrides.activities ?? [createActivity()];

  return { activities, classrooms, eventPrograms, organizationalUnits };
}
