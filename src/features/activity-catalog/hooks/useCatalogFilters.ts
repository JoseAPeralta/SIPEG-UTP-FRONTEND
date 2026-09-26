import { startTransition, useCallback, useMemo, useState } from "react";

import type { ActivityCatalog } from "@/types/domain";

import {
  buildActivityRows,
  filterActivityRows,
  paginateActivityRows,
  type ActivityTypeFilter,
  type ProgramFilter,
  type SortDirection,
  type UnitFilter,
} from "../model/catalogSelectors";

export type UseCatalogFiltersOptions = {
  initialSortDirection: SortDirection;
  initialUnitFilter?: UnitFilter | undefined;
  onUnitFilterChange?: ((value: UnitFilter) => void) | undefined;
  perPage: number;
};

export function useCatalogFilters(
  catalog: ActivityCatalog | null,
  options: UseCatalogFiltersOptions,
) {
  const { initialSortDirection, initialUnitFilter = "all", onUnitFilterChange, perPage } = options;
  const [searchTerm, setSearchTerm] = useState("");
  const [unitFilter, setUnitFilter] = useState<UnitFilter>(initialUnitFilter);
  const [typeFilter, setTypeFilter] = useState<ActivityTypeFilter>("all");
  const [programFilter, setProgramFilter] = useState<ProgramFilter>("all");
  const [sortDirection, setSortDirection] = useState<SortDirection>(initialSortDirection);
  const [page, setPage] = useState(1);

  const rows = useMemo(() => (catalog ? buildActivityRows(catalog) : []), [catalog]);
  const filteredRows = useMemo(
    () =>
      filterActivityRows(rows, {
        programFilter,
        searchTerm,
        sortDirection,
        typeFilter,
        unitFilter,
      }),
    [programFilter, rows, searchTerm, sortDirection, typeFilter, unitFilter],
  );
  const pagination = useMemo(
    () => paginateActivityRows(filteredRows, page, perPage),
    [filteredRows, page, perPage],
  );

  const updateFilter = useCallback((update: () => void) => {
    startTransition(() => {
      update();
      setPage(1);
    });
  }, []);

  const onSearchTermChange = useCallback(
    (value: string) => updateFilter(() => setSearchTerm(value)),
    [updateFilter],
  );
  const onUnitFilterChangeHandler = useCallback(
    (value: UnitFilter) => {
      updateFilter(() => setUnitFilter(value));
      onUnitFilterChange?.(value);
    },
    [onUnitFilterChange, updateFilter],
  );
  const onTypeFilterChange = useCallback(
    (value: ActivityTypeFilter) => updateFilter(() => setTypeFilter(value)),
    [updateFilter],
  );
  const onProgramFilterChange = useCallback(
    (value: ProgramFilter) => updateFilter(() => setProgramFilter(value)),
    [updateFilter],
  );
  const onSortDirectionChange = useCallback(
    (value: SortDirection) => updateFilter(() => setSortDirection(value)),
    [updateFilter],
  );
  const onClearFilters = useCallback(
    () =>
      updateFilter(() => {
        setSearchTerm("");
        setUnitFilter("all");
        setTypeFilter("all");
        setProgramFilter("all");
        setSortDirection(initialSortDirection);
        onUnitFilterChange?.("all");
      }),
    [initialSortDirection, onUnitFilterChange, updateFilter],
  );

  return {
    filteredCount: filteredRows.length,
    onClearFilters,
    onPageChange: setPage,
    onProgramFilterChange,
    onSearchTermChange,
    onSortDirectionChange,
    onTypeFilterChange,
    onUnitFilterChange: onUnitFilterChangeHandler,
    pageSize: perPage,
    pagination,
    programFilter,
    searchTerm,
    sortDirection,
    typeFilter,
    unitFilter,
  };
}
