import { useMemo } from "react";

import {
  buildActivityRows,
  buildUnitOptions,
  useActivityCatalog,
} from "@/features/activity-catalog";
import { useOperations } from "@/features/operations";
import {
  countConfirmedAttendance,
  countGeneratedCertificates,
  filterAttendanceByScope,
  filterCertificatesByScope,
} from "@/features/reports";
import { useUnitPreferenceStore } from "@/store/unitPreference";

export function useDashboardOverview() {
  const {
    catalog,
    error: catalogError,
    isLoading: isCatalogLoading,
  } = useActivityCatalog("administrative");
  const { error: operationsError, isLoading: isOperationsLoading, operations } = useOperations();
  const selectedUnitId = useUnitPreferenceStore((state) => state.selectedUnitId);
  const setSelectedUnitId = useUnitPreferenceStore((state) => state.setSelectedUnitId);

  const rows = useMemo(() => (catalog ? buildActivityRows(catalog) : []), [catalog]);
  const visibleRows = useMemo(
    () => (selectedUnitId === "all" ? rows : rows.filter((row) => row.unit.id === selectedUnitId)),
    [rows, selectedUnitId],
  );

  const visibleActivityIds = useMemo(
    () => visibleRows.map((row) => row.activity.id),
    [visibleRows],
  );

  const confirmedAttendanceCount = useMemo(() => {
    if (!operations) {
      return 0;
    }

    return countConfirmedAttendance(
      filterAttendanceByScope(operations.attendanceRecords, visibleActivityIds),
    );
  }, [operations, visibleActivityIds]);

  const generatedCertificatesCount = useMemo(() => {
    if (!operations) {
      return 0;
    }

    return countGeneratedCertificates(
      filterCertificatesByScope(operations.certificates, visibleActivityIds),
    );
  }, [operations, visibleActivityIds]);

  return {
    confirmedAttendanceCount,
    error: catalogError,
    generatedCertificatesCount,
    isLoading: isCatalogLoading,
    isOperationsLoading,
    onUnitChange: setSelectedUnitId,
    operationsError,
    recentRows: visibleRows.slice(0, 3),
    selectedUnitId,
    totalCapacity:
      catalog?.classrooms.reduce((total, classroom) => total + classroom.capacity, 0) ?? 0,
    unitOptions: catalog ? buildUnitOptions(catalog) : [],
    visibleActivityCount: visibleRows.length,
  };
}
