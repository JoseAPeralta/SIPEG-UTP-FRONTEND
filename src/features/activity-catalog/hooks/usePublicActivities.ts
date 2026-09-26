import { useMemo } from "react";

import { buildUnitOptions, summarizeCatalog } from "../model/catalogSelectors";
import { useActivityCatalog } from "./useActivityCatalog";
import { useCatalogFilters } from "./useCatalogFilters";

export const PUBLIC_ACTIVITIES_PER_PAGE = 10;

export function usePublicActivities() {
  const { catalog, error, isLoading, refetch } = useActivityCatalog();
  const {
    filteredCount,
    onPageChange,
    onSortDirectionChange,
    onTypeFilterChange,
    onUnitFilterChange,
    pageSize,
    pagination,
    sortDirection,
    typeFilter,
    unitFilter,
  } = useCatalogFilters(catalog, {
    initialSortDirection: "desc",
    perPage: PUBLIC_ACTIVITIES_PER_PAGE,
  });

  const summary = useMemo(() => (catalog ? summarizeCatalog(catalog) : null), [catalog]);
  const unitOptions = useMemo(() => (catalog ? buildUnitOptions(catalog) : []), [catalog]);

  return {
    catalog,
    error,
    filteredCount,
    isLoading,
    onPageChange,
    onSortDirectionChange,
    onTypeFilterChange,
    onUnitFilterChange,
    pageSize,
    pagination,
    refetch,
    sortDirection,
    summary,
    typeFilter,
    unitFilter,
    unitOptions,
  };
}
