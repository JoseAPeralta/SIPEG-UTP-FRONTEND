import { useCallback, useMemo, useState } from "react";

import { useAppAdapters } from "@/app/adapters/context";
import { PUBLIC_CATALOG_STALE_TIME_MS, queryKeys } from "@/app/query/publicCatalog";
import { useUnitPreferenceStore } from "@/store/unitPreference";
import { useQuery } from "@tanstack/react-query";

import {
  buildPublicActivityRows,
  buildPublicProgramOptions,
  filterPublicActivityRows,
  paginatePublicActivityRows,
  summarizePublicCatalog,
  type ActivityTypeFilter,
  type PublicCatalogPeriod,
  type SortDirection,
  type UnitFilter,
  type UnitTypeFilter,
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
 *
 * La preferencia de unidad (`useUnitPreferenceStore`) prioriza, no excluye: la
 * unidad elegida en el panel va primero y el resto sigue visible. El filtro
 * explicito de unidad es el unico que restringe.
 */
export function usePublicActivities() {
  const { publicActivityCatalog } = useAppAdapters();
  const selectedUnitId = useUnitPreferenceStore((state) => state.selectedUnitId);
  const [period, setPeriod] = useState<PublicCatalogPeriod>("available");
  const [programFilter, setProgramFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<ActivityTypeFilter>("all");
  const [unitFilter, setUnitFilter] = useState<UnitFilter>("all");
  const [unitTypeFilter, setUnitTypeFilter] = useState<UnitTypeFilter>("all");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
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
  const preferredUnit = selectedUnitId === "all" ? null : selectedUnitId;

  /**
   * El termino de busqueda renderiza un input controlado, asi que su actualizacion debe ser urgente:
   * una transicion retrasa el commit, el input conserva el valor anterior y las pulsaciones
   * siguientes se pierden sobre un estado obsoleto. La agenda es pequena y el filtrado cabe en el
   * mismo commit, de modo que no se difiere nada.
   */
  const updateFilter = useCallback((update: () => void) => {
    update();
    setPage(1);
  }, []);

  const onPeriodChange = useCallback(
    (value: PublicCatalogPeriod) =>
      updateFilter(() => {
        setPeriod(value);
        // Las pasadas se leen de la mas reciente a la mas antigua; cualquier
        // otra categoria arranca en orden cronologico.
        setSortDirection(value === "past" ? "desc" : "asc");
      }),
    [updateFilter],
  );

  const onSearchTermChange = useCallback(
    (value: string) => updateFilter(() => setSearchTerm(value)),
    [updateFilter],
  );

  const onProgramFilterChange = useCallback(
    (value: string) => updateFilter(() => setProgramFilter(value)),
    [updateFilter],
  );

  const onUnitFilterChange = useCallback(
    (value: UnitFilter) => updateFilter(() => setUnitFilter(value)),
    [updateFilter],
  );

  const onUnitTypeFilterChange = useCallback(
    (value: UnitTypeFilter) => updateFilter(() => setUnitTypeFilter(value)),
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

  const onClearFilters = useCallback(
    () =>
      updateFilter(() => {
        setPeriod("available");
        setProgramFilter("all");
        setSearchTerm("");
        setSortDirection("asc");
        setTypeFilter("all");
        setUnitFilter("all");
        setUnitTypeFilter("all");
      }),
    [updateFilter],
  );

  const filteredRows = useMemo(
    () =>
      filterPublicActivityRows(rows, {
        period,
        preferredUnit,
        programFilter,
        searchTerm,
        sortDirection,
        typeFilter,
        unitFilter,
        unitTypeFilter,
      }),
    [
      rows,
      period,
      preferredUnit,
      programFilter,
      searchTerm,
      sortDirection,
      typeFilter,
      unitFilter,
      unitTypeFilter,
    ],
  );

  const pagination = useMemo(
    () => paginatePublicActivityRows(filteredRows, page, PUBLIC_ACTIVITIES_PER_PAGE),
    [filteredRows, page],
  );

  const summary = useMemo(() => summarizePublicCatalog(data ?? null), [data]);
  const programOptions = useMemo(() => buildPublicProgramOptions(rows), [rows]);

  return {
    catalog: data ?? null,
    error,
    filteredCount: filteredRows.length,
    isLoading,
    onClearFilters,
    onPageChange: setPage,
    onPeriodChange,
    onProgramFilterChange,
    onSearchTermChange,
    onSortDirectionChange,
    onTypeFilterChange,
    onUnitFilterChange,
    onUnitTypeFilterChange,
    pageSize: PUBLIC_ACTIVITIES_PER_PAGE,
    pagination,
    period,
    preferredUnit,
    programFilter,
    programOptions,
    refetch,
    rows,
    searchTerm,
    sortDirection,
    summary,
    typeFilter,
    unitFilter,
    unitTypeFilter,
  };
}
