import type {
  AttendanceRecord,
  Career,
  Certificate,
  Classroom,
  EventPermission,
  Faculty,
  ReportMetric,
  SpeakerProposal,
  User,
} from "@/types/domain";

export { largeEvents } from "@/data/largeEvents";
export { smallEvents } from "@/data/smallEvents";

export const faculties: Faculty[] = [
  { id: "fic", name: "Facultad de Ingenieria Civil", shortName: "FIC" },
  { id: "fisc", name: "Facultad de Ingenieria de Sistemas Computacionales", shortName: "FISC" },
  { id: "fie", name: "Facultad de Ingenieria Electrica", shortName: "FIE" },
  { id: "fim", name: "Facultad de Ingenieria Mecanica", shortName: "FIM" },
];

export const careers: Career[] = [
  { id: "civil", facultyId: "fic", name: "Ingenieria Civil" },
  { id: "software", facultyId: "fisc", name: "Desarrollo de Software" },
  { id: "cybersecurity", facultyId: "fisc", name: "Ciberseguridad" },
  { id: "electrical", facultyId: "fie", name: "Ingenieria Electrica" },
  { id: "mechanical", facultyId: "fim", name: "Ingenieria Mecanica" },
];

export const users: User[] = [
  {
    careerId: "software",
    email: "mariana.rodriguez@utp.ac.pa",
    facultyId: "fisc",
    fullName: "Mariana Rodriguez",
    id: "user-1",
    role: "admin",
  },
  {
    careerId: "civil",
    email: "carlos.mendez@utp.ac.pa",
    facultyId: "fic",
    fullName: "Carlos Mendez",
    id: "user-2",
    role: "organizer",
  },
  {
    careerId: "electrical",
    email: "laura.chen@utp.ac.pa",
    facultyId: "fie",
    fullName: "Laura Chen",
    id: "user-3",
    role: "collaborator",
  },
  {
    careerId: "mechanical",
    email: "jorge.santos@utp.ac.pa",
    facultyId: "fim",
    fullName: "Jorge Santos",
    id: "user-4",
    role: "attendee",
  },
];

export const eventPermissions: EventPermission[] = [
  { eventId: "large-innovation-week", id: "permission-1", label: "Coordinacion", userId: "user-1" },
  { eventId: "large-innovation-week", id: "permission-2", label: "Registro", userId: "user-2" },
  { eventId: "small-smart-campus", id: "permission-3", label: "Asistencia", userId: "user-3" },
];

export const classrooms: Classroom[] = [
  {
    amenities: ["projector", "smart-board", "whiteboard"],
    availableDays: ["Lunes", "Miercoles", "Viernes"],
    availableHours: "08:00 - 16:00",
    capacity: 120,
    id: "auditorium-01",
    name: "Auditorio Roberto Barraza",
    type: "classroom",
  },
  {
    amenities: ["projector", "desks", "whiteboard"],
    availableDays: ["Martes", "Jueves"],
    availableHours: "09:00 - 18:00",
    capacity: 34,
    id: "lab-01",
    name: "Laboratorio de Analitica",
    type: "laboratory",
  },
  {
    amenities: ["tables", "whiteboard"],
    availableDays: ["Lunes", "Martes", "Jueves"],
    availableHours: "07:00 - 15:00",
    capacity: 48,
    id: "aula-10",
    name: "Aula 10B",
    type: "classroom",
  },
];

export const attendanceRecords: AttendanceRecord[] = [
  {
    code: "QR-1024",
    eventId: "small-smart-campus",
    id: "attendance-1",
    method: "qr",
    present: true,
    userId: "user-4",
  },
  {
    code: "MAN-771",
    eventId: "small-smart-campus",
    id: "attendance-2",
    method: "manual",
    present: true,
    userId: "user-2",
  },
  {
    code: "QR-2030",
    eventId: "small-bridge-resilience",
    id: "attendance-3",
    method: "qr",
    present: false,
    userId: "user-1",
  },
  {
    code: "QR-3031",
    eventId: "small-energy-lab",
    id: "attendance-4",
    method: "qr",
    present: true,
    userId: "user-3",
  },
];

export const certificates: Certificate[] = [
  {
    eventId: "small-smart-campus",
    generatedAt: "2026-06-15T16:30:00-05:00",
    id: "certificate-1",
    status: "generated",
    userId: "user-4",
  },
  {
    eventId: "small-energy-lab",
    generatedAt: "2026-05-28T14:00:00-05:00",
    id: "certificate-2",
    status: "generated",
    userId: "user-3",
  },
  {
    eventId: "small-bridge-resilience",
    generatedAt: "2026-07-08T17:00:00-05:00",
    id: "certificate-3",
    status: "pending",
    userId: "user-1",
  },
];

export const speakerProposals: SpeakerProposal[] = [
  {
    approximateDuration: "45 minutos",
    content: "Aplicacion practica de sensores urbanos, tableros de control y datos abiertos.",
    email: "elena.vargas@example.com",
    eventId: "small-smart-campus",
    firstName: "Elena",
    id: "proposal-1",
    lastName: "Vargas",
    proposalTitle: "Gobernanza de datos para campus inteligentes",
    submittedAt: "2026-04-18",
    talkType: "conference",
  },
  {
    approximateDuration: "2 horas",
    content: "Sesion aplicada para dimensionar prototipos de energia distribuida.",
    email: "paola.rivera@example.com",
    eventId: "small-energy-lab",
    firstName: "Paola",
    id: "proposal-2",
    lastName: "Rivera",
    proposalTitle: "Microredes para entornos educativos",
    submittedAt: "2026-04-22",
    talkType: "workshop",
  },
];

export const reportMetrics: ReportMetric[] = [
  {
    detail: "Frente al mes anterior",
    id: "metric-attendance",
    label: "Asistencia",
    trend: "up",
    value: "318",
  },
  {
    detail: "Disponibles para descarga",
    id: "metric-certificates",
    label: "Certificados",
    trend: "up",
    value: "214",
  },
  {
    detail: "Promedio semanal",
    id: "metric-classrooms",
    label: "Ocupacion de aulas",
    trend: "stable",
    value: "72%",
  },
  {
    detail: "Listos para exportar",
    id: "metric-reports",
    label: "Reportes",
    trend: "stable",
    value: "8",
  },
];
