import {
  findInstitutionalUnitByName,
  type OrganizationalUnitCode,
} from "@/features/organizational-units";
import type { PublicActivity, PublicActivityCatalog } from "@/types/domain";
import { getActivityTimestamp } from "@/utils/dateFormatting";

import { activityTypeLabels, getProgramBadgeLabel } from "./catalogLabels";

/** Filtro por unidad: `all` o el codigo institucional de una unidad. */
export type UnitFilter = "all" | OrganizationalUnitCode;
export type ActivityTypeFilter = "all" | PublicActivity["type"];
export type SortDirection = "asc" | "desc";

export type PublicCatalogFilters = {
  searchTerm: string;
  sortDirection: SortDirection;
  typeFilter: ActivityTypeFilter;
  unitFilter: UnitFilter;
};

/**
 * Una actividad de la agenda publica junto con su unidad institucional.
 *
 * `unit` es `null` cuando el nombre que trae el API no esta en el registro. No
 * se descarta la fila: la actividad sigue siendo visible y filtrable por tipo y
 * fecha, solo pierde el badge de unidad y no aparece en el filtro por unidad.
 */
export type PublicActivityRow = {
  activity: PublicActivity;
  /** Etiqueta del badge del programa, resuelta con la regla compartida. */
  programBadgeLabel: string;
  unitCode: OrganizationalUnitCode | null;
  unitLabel: string;
};

export type PublicPagination = {
  currentPage: number;
  pageCount: number;
  rows: PublicActivityRow[];
};

export type PublicCatalogSummary = {
  activityCount: number;
};

const toRow = (activity: PublicActivity): PublicActivityRow => {
  const unit = findInstitutionalUnitByName(activity.unit.name);
  const unitLabel = unit?.label ?? activity.unit.name;

  return {
    activity,
    programBadgeLabel: getProgramBadgeLabel(activity.program, { name: unitLabel }),
    unitCode: unit?.code ?? null,
    unitLabel,
  };
};

export function buildPublicActivityRows(
  catalog: PublicActivityCatalog | null,
): PublicActivityRow[] {
  if (!catalog) {
    return [];
  }

  return catalog.activities.map(toRow);
}

function searchText(row: PublicActivityRow): string {
  return [
    row.activity.name,
    row.activity.description,
    row.activity.type,
    row.activity.classroom?.name,
    row.activity.program.name,
    row.activity.program.label,
    row.unitLabel,
    ...row.activity.speakers.flatMap((speaker) => [speaker.firstName, speaker.lastName]),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function filterPublicActivityRows(
  rows: readonly PublicActivityRow[],
  filters: PublicCatalogFilters,
): PublicActivityRow[] {
  const term = filters.searchTerm.trim().toLowerCase();

  return rows
    .filter((row) => filters.unitFilter === "all" || row.unitCode === filters.unitFilter)
    .filter((row) => filters.typeFilter === "all" || row.activity.type === filters.typeFilter)
    .filter((row) => !term || searchText(row).includes(term))
    .sort((first, second) => {
      const difference =
        getActivityTimestamp(first.activity) - getActivityTimestamp(second.activity);

      return filters.sortDirection === "asc" ? difference : -difference;
    });
}

export function paginatePublicActivityRows(
  rows: readonly PublicActivityRow[],
  requestedPage: number,
  pageSize: number,
): PublicPagination {
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const normalized = Math.trunc(requestedPage);
  const currentPage = Math.min(
    Math.max(1, Number.isFinite(normalized) ? normalized : 1),
    pageCount,
  );
  const firstIndex = (currentPage - 1) * pageSize;

  return { currentPage, pageCount, rows: rows.slice(firstIndex, firstIndex + pageSize) };
}

export function summarizePublicCatalog(
  catalog: PublicActivityCatalog | null,
): PublicCatalogSummary | null {
  if (!catalog) {
    return null;
  }

  return { activityCount: catalog.activities.length };
}

/** Ordena los tipos por su etiqueta en español, para el desplegable de filtro. */
export const publicActivityTypeOptions = Object.entries(activityTypeLabels)
  .map(([id, label]) => ({ id: id as PublicActivity["type"], label }))
  .sort((first, second) => first.label.localeCompare(second.label, "es"));
