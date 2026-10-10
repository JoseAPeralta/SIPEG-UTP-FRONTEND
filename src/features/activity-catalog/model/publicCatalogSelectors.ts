import {
  findInstitutionalUnitByName,
  type OrganizationalUnitCode,
} from "@/features/organizational-units/public";
import type { OrganizationalUnitType, PublicActivity, PublicActivityCatalog } from "@/types/domain";
import { getActivityTimestamp } from "@/utils/dateFormatting";

import { activityTypeLabels, getProgramBadgeLabel } from "./catalogLabels";

/** Filtro por unidad: `all` o el codigo institucional de una unidad. */
export type UnitFilter = "all" | OrganizationalUnitCode;
export type ActivityTypeFilter = "all" | PublicActivity["type"];
export type SortDirection = "asc" | "desc";

/**
 * Categoria temporal de la agenda.
 *
 * Se deriva del estado efectivo que publica el contrato, no de la fecha: el
 * backend ya resuelve `SCHEDULED` antes del inicio, `ONGOING` dentro del rango y
 * `COMPLETED` al terminar, y una actividad pasada deja de ser disponible aunque
 * su fila siga en el listado.
 */
export type PublicCatalogPeriod = "available" | "upcoming" | "past" | "all";

/** Filtro por tipo de unidad: `all` o uno de los tipos del contrato. */
export type UnitTypeFilter = "all" | OrganizationalUnitType;

export type PublicCatalogFilters = {
  period: PublicCatalogPeriod;
  /** Unidad que va primero; `all` o vacio significan sin preferencia. */
  preferredUnit?: string | null;
  /** `all` o `program.id`. */
  programFilter: string;
  searchTerm: string;
  sortDirection: SortDirection;
  typeFilter: ActivityTypeFilter;
  unitFilter: UnitFilter;
  unitTypeFilter: UnitTypeFilter;
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

function matchesPeriod(status: PublicActivity["status"], period: PublicCatalogPeriod): boolean {
  switch (period) {
    case "available":
      return status === "SCHEDULED" || status === "ONGOING";
    case "upcoming":
      return status === "SCHEDULED";
    case "past":
      return status === "COMPLETED";
    case "all":
      return true;
  }
}

function normalizePreferredUnit(preferredUnit: string | null | undefined): string | null {
  return preferredUnit && preferredUnit !== "all" ? preferredUnit : null;
}

function matchesPreferredUnit(row: PublicActivityRow, preferredUnit: string): boolean {
  return row.unitCode === preferredUnit || row.activity.unit.backendId === preferredUnit;
}

export function filterPublicActivityRows(
  rows: readonly PublicActivityRow[],
  filters: PublicCatalogFilters,
): PublicActivityRow[] {
  const term = filters.searchTerm.trim().toLowerCase();
  const preferredUnit = normalizePreferredUnit(filters.preferredUnit);

  return rows
    .filter((row) => matchesPeriod(row.activity.status, filters.period))
    .filter((row) => filters.unitFilter === "all" || row.unitCode === filters.unitFilter)
    .filter(
      (row) =>
        filters.unitTypeFilter === "all" || row.activity.unit.type === filters.unitTypeFilter,
    )
    .filter(
      (row) => filters.programFilter === "all" || row.activity.program.id === filters.programFilter,
    )
    .filter((row) => filters.typeFilter === "all" || row.activity.type === filters.typeFilter)
    .filter((row) => !term || searchText(row).includes(term))
    .sort((first, second) => {
      if (preferredUnit) {
        const firstIsPreferred = matchesPreferredUnit(first, preferredUnit);
        const secondIsPreferred = matchesPreferredUnit(second, preferredUnit);

        if (firstIsPreferred !== secondIsPreferred) {
          return firstIsPreferred ? -1 : 1;
        }
      }

      const difference =
        getActivityTimestamp(first.activity) - getActivityTimestamp(second.activity);

      if (difference !== 0) {
        return filters.sortDirection === "asc" ? difference : -difference;
      }

      const idDifference = first.activity.id.localeCompare(second.activity.id);

      return filters.sortDirection === "asc" ? idDifference : -idDifference;
    });
}

/**
 * Opciones del filtro de programa, derivadas de todas las filas de la agenda.
 *
 * Se construyen una sola vez sobre el catalogo completo, no sobre el resultado
 * filtrado: si dependieran de lo visible, elegir un programa borraria las demas
 * opciones y no habria forma de volver a cambiar de programa.
 */
export function buildPublicProgramOptions(
  rows: readonly PublicActivityRow[],
): { id: string; label: string }[] {
  const labelById = new Map<string, string>();

  for (const row of rows) {
    const { id, label, name } = row.activity.program;

    if (!labelById.has(id)) {
      labelById.set(id, label ?? name);
    }
  }

  return [...labelById.entries()]
    .map(([id, label]) => ({ id, label }))
    .sort((first, second) => first.label.localeCompare(second.label, "es"));
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
