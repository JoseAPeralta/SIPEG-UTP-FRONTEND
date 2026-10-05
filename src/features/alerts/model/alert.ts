/**
 * Modelo de la bandeja privada de alertas (`Alert` del contrato).
 *
 * Las alertas pertenecen siempre a la identidad autenticada; el contrato no expone destinatario.
 * La traduccion de tipos y la resolucion de destinos a rutas internas pertenecen a 7.3.
 */

export const ALERT_TYPES = [
  "PROPOSAL_RECEIVED",
  "PROPOSAL_UPDATED",
  "PROPOSAL_RESPONDED",
  "PROGRAM_UPDATED",
  "PROGRAM_ARCHIVED",
  "ACTIVITY_UPDATED",
  "ACTIVITY_CANCELLED",
  "CERTIFICATE_ISSUED",
] as const;

export const ALERT_TARGET_KINDS = ["PROPOSAL", "EVENT_PROGRAM", "ACTIVITY", "CERTIFICATE"] as const;

export type AlertType = (typeof ALERT_TYPES)[number];

export type AlertTargetKind = (typeof ALERT_TARGET_KINDS)[number];

/** Referencia discriminada al objeto de dominio que origina la alerta. */
export type AlertTarget = {
  id: string;
  kind: AlertTargetKind;
};

export type Alert = {
  createdAt: string;
  id: string;
  isRead: boolean;
  target: AlertTarget;
  type: AlertType;
};

export type AlertsPage = {
  items: Alert[];
  limit: number;
  page: number;
  total: number;
  totalPages: number;
};

/** Resultado contractual de marcar todas las alertas propias como leidas. */
export type MarkAllAlertsReadResult = {
  updatedCount: number;
};

/**
 * Filtros del listado, uno por parametro del contrato. `isRead` es booleano en el modelo y el
 * adapter lo serializa como `"true"`/`"false"` porque asi lo exige la query.
 */
export type AlertFilters = {
  isRead?: boolean;
  type?: AlertType;
};

export function isAlertType(value: unknown): value is AlertType {
  return typeof value === "string" && (ALERT_TYPES as readonly string[]).includes(value);
}

export function isAlertTargetKind(value: unknown): value is AlertTargetKind {
  return typeof value === "string" && (ALERT_TARGET_KINDS as readonly string[]).includes(value);
}
