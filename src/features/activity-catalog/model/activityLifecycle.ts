import type { ActivityStatus } from "@/types/domain";

import type { CancelActivityRequest } from "./activityRequests";

export type ActivityLifecycleAction = "publish" | "unpublish" | "cancel" | "delete";

export const ACTIVITY_CANCEL_REASON_MAX_LENGTH = 500;

/** Clave del anuncio de eliminacion transportado como estado de navegacion hasta el destino. */
export const ACTIVITY_DELETION_NOTICE_KEY = "activityDeletionNotice";

const actionsByStatus = {
  DRAFT: ["publish", "cancel"],
  SCHEDULED: ["unpublish", "cancel"],
  ONGOING: ["cancel"],
  COMPLETED: [],
  CANCELLED: [],
} as const satisfies Record<ActivityStatus, readonly ActivityLifecycleAction[]>;

/** Transiciones admitidas por el contrato para cada estado efectivo. No decide autorizacion. */
export function getActivityLifecycleActions(
  status: ActivityStatus,
): readonly ActivityLifecycleAction[] {
  return actionsByStatus[status];
}

export class ActivityCancelReasonError extends Error {
  constructor() {
    super(`El motivo no puede superar ${ACTIVITY_CANCEL_REASON_MAX_LENGTH} caracteres.`);
    this.name = "ActivityCancelReasonError";
  }
}

/** Recorta el motivo; un texto vacio o de solo espacios no tiene motivo asociado. */
export function normalizeActivityCancelReason(reason?: string | null): string | undefined {
  const normalized = reason?.trim() ?? "";

  return normalized.length > 0 ? normalized : undefined;
}

/** Cuerpo contractual de cancelacion: omite el motivo ausente y rechaza el excedente. */
export function buildCancelActivityRequest(reason?: string | null): CancelActivityRequest {
  const normalized = normalizeActivityCancelReason(reason);

  if (normalized === undefined) return {};
  if (normalized.length > ACTIVITY_CANCEL_REASON_MAX_LENGTH) throw new ActivityCancelReasonError();

  return { reason: normalized };
}

/** Anuncio de resultado que el detalle muestra al cerrar la confirmacion. */
export function activityLifecycleSuccessMessage(
  action: ActivityLifecycleAction,
  name: string,
): string {
  if (action === "publish") return `La actividad «${name}» se publicó.`;
  if (action === "unpublish") return `La actividad «${name}» volvió a borrador.`;

  return `La actividad «${name}» se canceló.`;
}

/** Anuncio positivo de la eliminacion; se presenta en el destino, no como perdida de acceso. */
export function activityDeletionSuccessMessage(name: string): string {
  return `El borrador de «${name}» se eliminó.`;
}

/** Lee el anuncio de eliminacion del estado de navegacion, si el destino lo recibio. */
export function readActivityDeletionNotice(state: unknown): string | null {
  if (typeof state !== "object" || state === null) return null;

  const value = (state as Record<string, unknown>)[ACTIVITY_DELETION_NOTICE_KEY];

  return typeof value === "string" && value.length > 0 ? value : null;
}
