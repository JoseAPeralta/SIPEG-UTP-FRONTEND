import { useMemo } from "react";

import type { ActivitySummary } from "@/types/domain";

import { useOperations } from "@/features/operations";
import { useWorkingContext } from "@/features/working-context";

import {
  countConfirmedAttendance,
  countGeneratedCertificates,
  filterAttendanceByScope,
  filterCertificatesByScope,
} from "../model/scopeMetrics";

export type ReportsOverviewReport = {
  activities: ActivitySummary[];
  confirmedAttendanceCount: number;
  /**
   * `null` mientras el listado no publique un total agregado: sumarlo exigiria una peticion de
   * detalle por actividad, que 5.9 elimino del catalogo.
   */
  enrolledCount: number | null;
  generatedCertificatesCount: number;
};

export function useReportsOverview() {
  const { catalog, error: catalogError, isLoading: isCatalogLoading, scope } = useWorkingContext();
  const { error: operationsError, isLoading: isOperationsLoading, operations } = useOperations();

  const report = useMemo<ReportsOverviewReport | null>(() => {
    if (!catalog || !operations || !scope) {
      return null;
    }

    const scopedActivityIds = new Set(scope.activityIds);
    const activities = catalog.activities.filter((activity) => scopedActivityIds.has(activity.id));
    const attendanceRecords = filterAttendanceByScope(
      operations.attendanceRecords,
      scope.activityIds,
    );
    const certificates = filterCertificatesByScope(operations.certificates, scope.activityIds);

    return {
      activities,
      confirmedAttendanceCount: countConfirmedAttendance(attendanceRecords),
      enrolledCount: null,
      generatedCertificatesCount: countGeneratedCertificates(certificates),
    };
  }, [catalog, operations, scope]);

  return {
    error: catalogError ?? operationsError,
    isLoading: isCatalogLoading || isOperationsLoading,
    report,
    scope,
  };
}
