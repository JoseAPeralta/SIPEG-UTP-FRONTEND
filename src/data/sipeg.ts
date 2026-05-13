import type {
  AttendanceRecord,
  Career,
  Certificate,
  Classroom,
  EventPermission,
  Faculty,
  LargeEvent,
  ReportMetric,
  SmallEvent,
  SpeakerProposal,
  User,
} from "@/types/domain";

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

export const largeEvents: LargeEvent[] = [
  {
    banner: "innovation-week.jpg",
    collaboratorIds: ["user-1", "user-2"],
    customLabel: "Semana de innovacion",
    endDate: "2026-06-19",
    facultyId: "fisc",
    id: "large-innovation-week",
    name: "Semana UTP de Innovacion Academica",
    permissionIds: ["permission-1", "permission-2"],
    startDate: "2026-06-15",
  },
  {
    banner: "infrastructure-forum.jpg",
    collaboratorIds: ["user-2"],
    customLabel: "Foro tecnico",
    endDate: "2026-07-10",
    facultyId: "fic",
    id: "large-infrastructure-forum",
    name: "Foro de Infraestructura Resiliente",
    permissionIds: [],
    startDate: "2026-07-08",
  },
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

export const smallEvents: SmallEvent[] = [
  {
    banner: "smart-campus.jpg",
    classroomId: "auditorium-01",
    collaboratorIds: ["user-1", "user-3"],
    date: "2026-06-15",
    description:
      "Una jornada aplicada sobre datos abiertos, sensores y coordinacion academica para convertir los campus universitarios en espacios mas eficientes y medibles.",
    endTime: "11:30",
    equipment: ["Proyector", "Audio", "QR de asistencia"],
    facultyId: "fisc",
    id: "small-smart-campus",
    inheritedPermissionIds: ["permission-1", "permission-2"],
    name: "Campus inteligente y datos abiertos",
    parentEventId: "large-innovation-week",
    permissionIds: ["permission-3"],
    registeredAttendees: 180,
    speakers: [
      {
        name: "Dra. Elena Vargas",
        organization: "Centro de Innovacion UTP",
      },
      {
        name: "Ing. Marcos Lee",
        organization: "Autoridad Nacional para la Innovacion Gubernamental",
      },
    ],
    startTime: "09:00",
    type: "conference",
  },
  {
    banner: "bridge-resilience.jpg",
    classroomId: "aula-10",
    collaboratorIds: ["user-2"],
    date: "2026-07-08",
    description:
      "Seminario sobre criterios de diseno, inspeccion preventiva y materiales para infraestructura vial expuesta a ambientes costeros.",
    endTime: "15:00",
    equipment: ["Pizarra", "Mesas tecnicas"],
    facultyId: "fic",
    id: "small-bridge-resilience",
    inheritedPermissionIds: [],
    name: "Puentes resilientes para zonas costeras",
    parentEventId: "large-infrastructure-forum",
    permissionIds: [],
    registeredAttendees: 96,
    speakers: [
      {
        name: "Ing. Ricardo Batista",
        organization: "Ministerio de Obras Publicas",
      },
    ],
    startTime: "13:30",
    type: "seminar",
  },
  {
    banner: "energy-lab.jpg",
    classroomId: "lab-01",
    collaboratorIds: ["user-3"],
    date: "2026-05-28",
    description:
      "Sesion practica con prototipos de microredes, medicion de carga y criterios de seguridad para laboratorios de energia distribuida.",
    endTime: "12:30",
    equipment: ["Banco de pruebas", "Proyector"],
    facultyId: "fie",
    id: "small-energy-lab",
    inheritedPermissionIds: [],
    name: "Laboratorio abierto de energia distribuida",
    permissionIds: [],
    registeredAttendees: 42,
    speakers: [
      {
        name: "MSc. Paola Rivera",
        organization: "Instituto de Energia y Ambiente",
      },
    ],
    startTime: "10:30",
    type: "workshop",
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
