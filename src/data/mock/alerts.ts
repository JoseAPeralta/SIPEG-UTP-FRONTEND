import type { Alert } from "@/features/alerts/model/alert";

/**
 * Bandeja de demostracion de `user-1`. Los destinos apuntan a identificadores que ya existen en
 * los fixtures (programas, actividades, propuestas y certificados) para que 7.3 pueda enlazarlos
 * sin inventar rutas. El adapter mock ordena por fecha; este arreglo no depende de su orden.
 */
export const alerts: Alert[] = [
  {
    createdAt: "2026-06-18T16:45:00.000Z",
    id: "alert-activity-updated",
    isRead: true,
    target: { id: "activity-open-data-governance", kind: "ACTIVITY" },
    type: "ACTIVITY_UPDATED",
  },
  {
    createdAt: "2026-06-21T15:30:00.000Z",
    id: "alert-certificate-issued",
    isRead: false,
    target: { id: "certificate-2", kind: "CERTIFICATE" },
    type: "CERTIFICATE_ISSUED",
  },
  {
    createdAt: "2026-06-10T13:00:00.000Z",
    id: "alert-activity-cancelled",
    isRead: false,
    target: { id: "activity-bridge-resilience", kind: "ACTIVITY" },
    type: "ACTIVITY_CANCELLED",
  },
  {
    createdAt: "2026-06-19T09:10:00.000Z",
    id: "alert-proposal-received",
    isRead: false,
    target: { id: "proposal-1", kind: "PROPOSAL" },
    type: "PROPOSAL_RECEIVED",
  },
  {
    createdAt: "2026-06-15T11:20:00.000Z",
    id: "alert-program-updated",
    isRead: true,
    target: { id: "program-fisc-default", kind: "EVENT_PROGRAM" },
    type: "PROGRAM_UPDATED",
  },
  {
    createdAt: "2026-06-12T08:05:00.000Z",
    id: "alert-proposal-responded",
    isRead: true,
    target: { id: "proposal-2", kind: "PROPOSAL" },
    type: "PROPOSAL_RESPONDED",
  },
];
