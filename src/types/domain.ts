export type FacultyId = "fic" | "fie" | "fim" | "fisc";

export type Faculty = {
  id: FacultyId;
  name: string;
  shortName: string;
};

export type Career = {
  id: string;
  facultyId: Faculty["id"];
  name: string;
};

export type UserRole = "admin" | "organizer" | "collaborator" | "attendee" | "speaker";

export type User = {
  careerId: Career["id"];
  email: string;
  facultyId: Faculty["id"];
  fullName: string;
  id: string;
  role: UserRole;
};

export type EventPermission = {
  id: string;
  eventId: string;
  label: string;
  userId: User["id"];
};

export type LargeEvent = {
  banner: string;
  collaboratorIds: User["id"][];
  customLabel: string;
  endDate: string;
  facultyId: Faculty["id"];
  id: string;
  name: string;
  permissionIds: EventPermission["id"][];
  startDate: string;
};

export type EventType = "conference" | "seminar" | "talk" | "workshop";

export type SmallEvent = {
  banner: string;
  classroomId: Classroom["id"];
  collaboratorIds: User["id"][];
  date: string;
  equipment: string[];
  facultyId: Faculty["id"];
  id: string;
  inheritedPermissionIds: EventPermission["id"][];
  name: string;
  parentEventId?: LargeEvent["id"];
  permissionIds: EventPermission["id"][];
  registeredAttendees: number;
  speaker: string;
  time: string;
  type: EventType;
};

export type AttendanceRecord = {
  code: string;
  eventId: SmallEvent["id"];
  id: string;
  method: "manual" | "qr";
  present: boolean;
  userId: User["id"];
};

export type Certificate = {
  eventId: SmallEvent["id"];
  generatedAt: string;
  id: string;
  status: "generated" | "pending";
  userId: User["id"];
};

export type ClassroomAmenity = "desks" | "projector" | "smart-board" | "tables" | "whiteboard";

export type Classroom = {
  amenities: ClassroomAmenity[];
  availableDays: string[];
  availableHours: string;
  capacity: number;
  id: string;
  name: string;
  type: "classroom" | "laboratory";
};

export type SpeakerProposal = {
  approximateDuration: string;
  content: string;
  email: string;
  eventId: SmallEvent["id"];
  firstName: string;
  id: string;
  lastName: string;
  proposalTitle: string;
  submittedAt: string;
  talkType: EventType;
};

export type ReportMetric = {
  detail: string;
  id: string;
  label: string;
  trend: "down" | "stable" | "up";
  value: string;
};
