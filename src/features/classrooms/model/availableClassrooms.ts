import type { ClassroomType } from "@/types/domain";

/** Criterios que el contrato admite para buscar un aula que cubra una actividad completa. */
export type AvailableClassroomsCriteria = {
  amenity?: string;
  date: string;
  endTime: string;
  minCapacity?: number;
  startTime: string;
  type?: ClassroomType;
};

const INSTITUTIONAL_DATE = /^\d{4}-\d{2}-\d{2}$/;
const INSTITUTIONAL_TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Removes presentation-only whitespace so equal searches share one query identity. */
export function normalizeAvailableClassroomsCriteria(
  criteria: AvailableClassroomsCriteria,
): AvailableClassroomsCriteria {
  const amenity = criteria.amenity?.trim();

  return {
    ...(amenity ? { amenity } : {}),
    date: criteria.date.trim(),
    endTime: criteria.endTime.trim(),
    ...(criteria.minCapacity === undefined ? {} : { minCapacity: criteria.minCapacity }),
    startTime: criteria.startTime.trim(),
    ...(criteria.type ? { type: criteria.type } : {}),
  };
}

/** The client only sends a search once every mandatory contract value is usable. */
export function isAvailableClassroomsCriteriaValid(criteria: AvailableClassroomsCriteria): boolean {
  const normalized = normalizeAvailableClassroomsCriteria(criteria);

  return (
    INSTITUTIONAL_DATE.test(normalized.date) &&
    INSTITUTIONAL_TIME.test(normalized.startTime) &&
    INSTITUTIONAL_TIME.test(normalized.endTime) &&
    normalized.startTime < normalized.endTime &&
    (normalized.minCapacity === undefined ||
      (Number.isInteger(normalized.minCapacity) && normalized.minCapacity > 0))
  );
}
