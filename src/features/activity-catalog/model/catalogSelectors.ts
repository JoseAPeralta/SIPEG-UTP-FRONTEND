import type {
  ActivityCatalog,
  ActivitySummary,
  ActivityType,
  Classroom,
  EventProgram,
  OrganizationalUnit,
} from "@/types/domain";

import { getActivityTimestamp } from "@/utils/dateFormatting";

import { getProgramBadgeLabel } from "./catalogLabels";

export type UnitFilter = "all" | (string & {});
export type ActivityTypeFilter = "all" | ActivityType;
export type ProgramFilter = "all" | (string & {});
export type SortDirection = "asc" | "desc";

export type CatalogFilters = {
  programFilter: ProgramFilter;
  searchTerm: string;
  sortDirection: SortDirection;
  typeFilter: ActivityTypeFilter;
  unitFilter: UnitFilter;
};

export type ActivityRow = {
  activity: ActivitySummary;
  classroom: Classroom | null;
  program: EventProgram;
  unit: OrganizationalUnit;
};

export type PaginatedRows = {
  currentPage: number;
  pageCount: number;
  rows: ActivityRow[];
};

export type CatalogSummary = {
  activityCount: number;
  /** `null` mientras el listado no publique un total agregado: el detalle si lo expone. */
  enrolledCount: number | null;
  programCount: number;
  unitCount: number;
};

export type ProgramSummary = {
  activityCount: number;
  /** `null` mientras el listado no publique un total agregado: el detalle si lo expone. */
  enrolledCount: number | null;
  program: EventProgram;
  unit: OrganizationalUnit;
};

export type SelectOption = {
  id: string;
  label: string;
};

export const activityTypeFilterOrder: ActivityType[] = [
  "TALK",
  "CONFERENCE",
  "SEMINAR",
  "WORKSHOP",
  "COURSE",
  "PANEL",
  "COMPETITION",
  "OTHER",
];

/**
 * Label for the program badge of a card. Default programs are named
 * "Programa de Eventos - <unidad>" by the backend, so we prefer the custom
 * label, fall back to the owning unit name for default programs (avoiding the
 * prefix) and use the program name for additional programs without a label.
 *
 * @see getProgramBadgeLabel in ./catalogLabels, which the public agenda shares.
 */
export { getProgramBadgeLabel };

export function buildActivityRows(catalog: ActivityCatalog): ActivityRow[] {
  const programById = new Map(catalog.eventPrograms.map((program) => [program.id, program]));
  const unitById = new Map(catalog.organizationalUnits.map((unit) => [unit.id, unit]));
  const classroomById = new Map(catalog.classrooms.map((classroom) => [classroom.id, classroom]));

  return catalog.activities.flatMap((activity) => {
    const program = programById.get(activity.eventProgramId);
    const unit = program ? unitById.get(program.organizationalUnitId) : undefined;

    if (!program || !unit) {
      return [];
    }

    return [
      {
        activity,
        classroom: activity.classroomId ? (classroomById.get(activity.classroomId) ?? null) : null,
        program,
        unit,
      },
    ];
  });
}

function getSearchText(row: ActivityRow) {
  return [
    row.activity.name,
    row.activity.description,
    row.activity.type,
    row.classroom?.name,
    row.program.name,
    row.program.label,
    row.unit.name,
    row.unit.code,
    ...row.activity.speakers.flatMap((speaker) => [speaker.firstName, speaker.lastName]),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function filterActivityRows(
  rows: readonly ActivityRow[],
  filters: CatalogFilters,
): ActivityRow[] {
  const normalizedSearchTerm = filters.searchTerm.trim().toLowerCase();

  return rows
    .filter((row) => filters.unitFilter === "all" || row.unit.id === filters.unitFilter)
    .filter((row) => filters.typeFilter === "all" || row.activity.type === filters.typeFilter)
    .filter((row) => filters.programFilter === "all" || row.program.id === filters.programFilter)
    .filter((row) => !normalizedSearchTerm || getSearchText(row).includes(normalizedSearchTerm))
    .sort((firstRow, secondRow) => {
      const difference =
        getActivityTimestamp(firstRow.activity) - getActivityTimestamp(secondRow.activity);

      return filters.sortDirection === "asc" ? difference : -difference;
    });
}

export function paginateActivityRows(
  rows: readonly ActivityRow[],
  requestedPage: number,
  pageSize: number,
): PaginatedRows {
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const normalizedPage = Math.trunc(requestedPage);
  const currentPage = Math.min(
    Math.max(1, Number.isFinite(normalizedPage) ? normalizedPage : 1),
    pageCount,
  );
  const firstIndex = (currentPage - 1) * pageSize;

  return {
    currentPage,
    pageCount,
    rows: rows.slice(firstIndex, firstIndex + pageSize),
  };
}

export function summarizeCatalog(catalog: ActivityCatalog): CatalogSummary {
  return {
    activityCount: catalog.activities.length,
    enrolledCount: null,
    programCount: catalog.eventPrograms.length,
    unitCount: catalog.organizationalUnits.length,
  };
}

export function buildProgramSummaries(catalog: ActivityCatalog): ProgramSummary[] {
  const rows = buildActivityRows(catalog);

  return catalog.eventPrograms.flatMap((program) => {
    const unit = catalog.organizationalUnits.find(
      (candidate) => candidate.id === program.organizationalUnitId,
    );

    if (!unit) {
      return [];
    }

    const programRows = rows.filter((row) => row.program.id === program.id);

    return [
      {
        activityCount: programRows.length,
        enrolledCount: null,
        program,
        unit,
      },
    ];
  });
}

export function buildUnitOptions(catalog: ActivityCatalog): SelectOption[] {
  return catalog.organizationalUnits.map((unit) => ({
    id: unit.id,
    label: `${unit.code} - ${unit.name}`,
  }));
}

export function buildProgramOptions(catalog: ActivityCatalog): SelectOption[] {
  return catalog.eventPrograms.map((program) => ({
    id: program.id,
    label: program.name,
  }));
}
