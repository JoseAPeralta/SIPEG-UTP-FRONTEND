import type { AlertType } from "./alert";

/** Etiquetas de producto para los tipos de alerta. Nunca se muestra el codigo del contrato. */
export const alertTypeLabels: Record<AlertType, string> = {
  ACTIVITY_CANCELLED: "Actividad cancelada",
  ACTIVITY_UPDATED: "Actividad actualizada",
  CERTIFICATE_ISSUED: "Certificado emitido",
  PROGRAM_ARCHIVED: "Programa archivado",
  PROGRAM_UPDATED: "Programa actualizado",
  PROPOSAL_RECEIVED: "Propuesta recibida",
  PROPOSAL_RESPONDED: "Respuesta a una propuesta",
  PROPOSAL_UPDATED: "Propuesta actualizada",
};

export const alertReadStateLabels = { read: "Leída", unread: "Sin leer" } as const;
