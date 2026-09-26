import type { AttendanceRecord, Certificate, ReportMetric, SpeakerProposal } from "@/types/domain";

export const attendanceRecords: AttendanceRecord[] = [
  {
    activityId: "activity-open-data-governance",
    code: "QR-1024",
    id: "attendance-1",
    method: "QR",
    present: true,
    userId: "user-2",
  },
  {
    activityId: "activity-bridge-resilience",
    code: "QR-2030",
    id: "attendance-2",
    method: "QR",
    present: false,
    userId: "user-1",
  },
  {
    activityId: "activity-protection-relays-practice",
    code: "MAN-771",
    id: "attendance-3",
    method: "MANUAL",
    present: true,
    userId: "user-3",
  },
  {
    activityId: "activity-cnc-safety-maintenance",
    code: "QR-3031",
    id: "attendance-4",
    method: "QR",
    present: true,
    userId: "user-4",
  },
  {
    activityId: "activity-scientific-writing-clinic",
    code: "MAN-118",
    id: "attendance-5",
    method: "MANUAL",
    present: true,
    userId: "user-2",
  },
];

export const certificates: Certificate[] = [
  {
    activityId: "activity-open-data-governance",
    generatedAt: "2026-06-15T16:30:00-05:00",
    id: "certificate-1",
    status: "GENERATED",
    userId: "user-2",
  },
  {
    activityId: "activity-bridge-resilience",
    generatedAt: "2026-07-08T17:00:00-05:00",
    id: "certificate-2",
    status: "PENDING",
    userId: "user-1",
  },
  {
    activityId: "activity-cnc-safety-maintenance",
    generatedAt: "2026-08-24T18:00:00-05:00",
    id: "certificate-3",
    status: "GENERATED",
    userId: "user-4",
  },
  {
    activityId: "activity-protection-relays-practice",
    generatedAt: "2026-08-05T15:00:00-05:00",
    id: "certificate-4",
    status: "PENDING",
    userId: "user-3",
  },
];

export const speakerProposals: SpeakerProposal[] = [
  {
    approximateDuration: "45 minutos",
    content: "Aplicacion practica de sensores urbanos, tableros de control y datos abiertos.",
    email: "elena.vargas@example.com",
    eventProgramId: "program-innovation-week",
    firstName: "Elena",
    id: "proposal-1",
    lastName: "Vargas",
    proposalTitle: "Gobernanza de datos para campus inteligentes",
    submittedAt: "2026-04-18",
    talkType: "TALK",
  },
  {
    approximateDuration: "2 horas",
    content: "Sesion aplicada para dimensionar prototipos de energia distribuida.",
    email: "paola.rivera@example.com",
    eventProgramId: "program-energy-transition-summit",
    firstName: "Paola",
    id: "proposal-2",
    lastName: "Rivera",
    proposalTitle: "Microredes para entornos educativos",
    submittedAt: "2026-04-22",
    talkType: "WORKSHOP",
  },
  {
    approximateDuration: "1 hora",
    content:
      "Metodologias de escritura cientifica y gestion de referencias para proyectos de grado.",
    email: "isabel.torres@example.com",
    eventProgramId: "program-research-extension-days",
    firstName: "Isabel",
    id: "proposal-3",
    lastName: "Torres",
    proposalTitle: "Acompanamiento para publicaciones academicas",
    submittedAt: "2026-08-30",
    talkType: "SEMINAR",
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
