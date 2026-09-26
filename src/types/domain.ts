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
  id: string;
  name: string;
  unitId: string | null;
};

export type GlobalRole = "ADMIN" | "USER";

export type User = {
  careerId: string | null;
  email: string;
  firstName: string;
  globalRole: GlobalRole;
  id: string;
  isActive: boolean;
  lastName: string;
  unitId: string | null;
};

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

export type OperationsReadModel = {
  attendanceRecords: AttendanceRecord[];
  careers: Career[];
  certificates: Certificate[];
  reportMetrics: ReportMetric[];
  speakerProposals: SpeakerProposal[];
  users: User[];
};

export type WorkingContext =
  { id: string; kind: "eventProgram" } | { id: string; kind: "activity" };
