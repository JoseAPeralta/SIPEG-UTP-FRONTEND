import { useCallback, useMemo, useState, startTransition } from "react";

import { useAppAdapters } from "@/app/adapters";
import { PUBLIC_CATALOG_STALE_TIME_MS, queryKeys } from "@/app/query";
import { useQuery } from "@tanstack/react-query";

import {
  buildPublicActivityRows,
  filterPublicActivityRows,
  paginatePublicActivityRows,
  summarizePublicCatalog,
  type ActivityTypeFilter,
  type SortDirection,
  type UnitFilter,
} from "../model/publicCatalogSelectors";

export const PUBLIC_ACTIVITIES_PER_PAGE = 10;

/**
 * Agenda publica.
 *
 * Resuelve una sola peticion: el listado publico de actividades ya trae aula,
 * programa y unidad embebidos, y las unidades y los tipos de filtro salen del
 * registro institucional del frontend. El filtrado, el orden y la paginacion
 * ocurren aqui sobre el conjunto completo, que es el comportamiento que la vista
 * ya tenia.
 */
export function usePublicActivities() {
  const { publicActivityCatalog } = useAppAdapters();
  const [unitFilter, setUnitFilter] = useState<UnitFilter>("all");
  const [typeFilter, setTypeFilter] = useState<ActivityTypeFilter>("all");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [page, setPage] = useState(1);

  const { data, error, isLoading, refetch } = useQuery({
    queryFn: () => publicActivityCatalog.loadPublicActivities(),
    queryKey: queryKeys.publicActivityCatalog,
    // La agenda es anonima y cambia poco: no se revalida al volver a la pestana
    // porque eso descargaria la agenda entera en cada cambio de foco.
    refetchOnWindowFocus: false,
    staleTime: PUBLIC_CATALOG_STALE_TIME_MS,
  });

  const rows = useMemo(() => buildPublicActivityRows(data ?? null), [data]);

  const updateFilter = useCallback((update: () => void) => {
    startTransition(() => {
      update();
      setPage(1);
    });
  }, []);

  const filteredRows = useMemo(
    () =>
      filterPublicActivityRows(rows, {
        searchTerm: "",
        sortDirection,
        typeFilter,
        unitFilter,
      }),
    [rows, sortDirection, typeFilter, unitFilter],
  );

  const pagination = useMemo(
    () => paginatePublicActivityRows(filteredRows, page, PUBLIC_ACTIVITIES_PER_PAGE),
    [filteredRows, page],
  );

  const summary = useMemo(() => summarizePublicCatalog(data ?? null), [data]);

  const onUnitFilterChange = useCallback(
    (value: UnitFilter) => updateFilter(() => setUnitFilter(value)),
    [updateFilter],
  );

  const onTypeFilterChange = useCallback(
    (value: ActivityTypeFilter) => updateFilter(() => setTypeFilter(value)),
    [updateFilter],
  );

  const onSortDirectionChange = useCallback(
    (value: SortDirection) => updateFilter(() => setSortDirection(value)),
    [updateFilter],
  );

  return {
    catalog: data ?? null,
    error,
    filteredCount: filteredRows.length,
    isLoading,
    onPageChange: setPage,
    onSortDirectionChange,
    onTypeFilterChange,
    onUnitFilterChange,
    pageSize: PUBLIC_ACTIVITIES_PER_PAGE,
    pagination,
    refetch,
    rows,
    sortDirection,
    summary,
    typeFilter,
    unitFilter,
  };
}
