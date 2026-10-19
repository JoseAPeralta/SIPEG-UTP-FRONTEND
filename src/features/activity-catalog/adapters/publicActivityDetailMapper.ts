import type { ActivityStatus } from "@/types/domain";

import type { PublicActivityDetail } from "../model/publicActivityDetail";

import {
  mapPublicActivityBase,
  readArray,
  readEnum,
  readNumber,
  readObject,
  readRequiredNullableString,
  readString,
} from "./publicActivityMapper";

/**
 * Estados que el detalle publico acepta. `CANCELLED` si se informa, pero
 * `DRAFT` nunca: la operacion anonima no lo devuelve, asi que verlo significa
 * drift del contrato y se rechaza en lugar de degradarlo a `null`.
 */
const PUBLIC_DETAIL_STATUSES: readonly Exclude<ActivityStatus, "DRAFT">[] = [
  "SCHEDULED",
  "ONGOING",
  "COMPLETED",
  "CANCELLED",
];

/**
 * Mapea un `ActivityDetail` del detalle publico.
 *
 * Valida el DTO completo, incluidos `equipment` y `checkedInCount`, aunque el
 * read model no los exponga: el detalle publico muestra motivo de cancelacion e
 * inscritos, no equipamiento ni asistencias.
 */
export function mapPublicActivityDetail(raw: unknown, context = "activity"): PublicActivityDetail {
  const activity = readObject(raw, context);

  const status = readEnum(activity["status"], PUBLIC_DETAIL_STATUSES, `${context}.status`);
  const cancelReason = readRequiredNullableString(
    activity["cancelReason"],
    `${context}.cancelReason`,
  );
  const enrolledCount = readNumber(activity["enrolledCount"], `${context}.enrolledCount`);

  readNumber(activity["checkedInCount"], `${context}.checkedInCount`);
  readArray(activity["equipment"], `${context}.equipment`).forEach((item, index) => {
    readString(item, `${context}.equipment[${index}]`);
  });

  return {
    ...mapPublicActivityBase(activity, context),
    cancelReason,
    enrolledCount,
    status,
  };
}
