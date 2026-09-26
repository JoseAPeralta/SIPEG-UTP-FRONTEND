import { useCallback, useMemo } from "react";

import { resolveWorkingScope, type WorkingContext } from "@/features/working-context";
import { useUnitPreferenceStore } from "@/store/unitPreference";
import { useWorkingContextStore } from "@/store/workingContext";

import {
  buildProgramOptions,
  buildProgramSummaries,
  buildUnitOptions,
  summarizeCatalog,
} from "../model/catalogSelectors";
import { useActivityCatalog } from "./useActivityCatalog";
import { useCatalogFilters } from "./useCatalogFilters";

export const ADMIN_ACTIVITIES_PER_PAGE = 9;

export function useActivityCatalogPage() {
  const { catalog, error, isLoading, refetch } = useActivityCatalog("administrative");
  const selectedUnitId = useUnitPreferenceStore((state) => state.selectedUnitId);
  const setSelectedUnitId = useUnitPreferenceStore((state) => state.setSelectedUnitId);
  const workingContext = useWorkingContextStore((state) => state.workingContext);
  const setWorkingContext = useWorkingContextStore((state) => state.setWorkingContext);
  const {
    filteredCount,
    onClearFilters,
    onPageChange,
    onProgramFilterChange,
    onSearchTermChange,
    onSortDirectionChange,
    onTypeFilterChange,
    onUnitFilterChange,
    pageSize,
    pagination,
    programFilter,
    searchTerm,
    sortDirection,
    typeFilter,
    unitFilter,
  } = useCatalogFilters(catalog, {
    initialSortDirection: "asc",
    initialUnitFilter: selectedUnitId,
    onUnitFilterChange: setSelectedUnitId,
    perPage: ADMIN_ACTIVITIES_PER_PAGE,
  });

  const summary = useMemo(() => (catalog ? summarizeCatalog(catalog) : null), [catalog]);
  const selectedScope = useMemo(
    () => (catalog ? resolveWorkingScope(workingContext, catalog) : null),
    [catalog, workingContext],
  );
  const programSummaries = useMemo(
    () => (catalog ? buildProgramSummaries(catalog) : []),
    [catalog],
  );
  const unitOptions = useMemo(() => (catalog ? buildUnitOptions(catalog) : []), [catalog]);
  const programOptions = useMemo(() => (catalog ? buildProgramOptions(catalog) : []), [catalog]);

  const onSelectContext = useCallback(
    (context: WorkingContext | null) => setWorkingContext(context),
    [setWorkingContext],
  );

  return {
    catalog,
    error,
    filteredCount,
    isLoading,
    onClearFilters,
    onPageChange,
    onProgramFilterChange,
    onSearchTermChange,
    onSelectContext,
    onSortDirectionChange,
    onTypeFilterChange,
    onUnitFilterChange,
    pageSize,
    pagination,
    programFilter,
    programOptions,
    programSummaries,
    refetch,
    searchTerm,
    selectedScope,
    sortDirection,
    summary,
    typeFilter,
    unitFilter,
    unitOptions,
    workingContext,
  };
}
