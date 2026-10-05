import { useMemo } from "react";

import { useOperations } from "@/features/operations";
import { useWorkingContext } from "@/features/working-context";

import {
  countConfirmedAttendance,
  countGeneratedCertificates,
  filterAttendanceByScope,
  filterCertificatesByScope,
  sumEnrolledCount,
} from "../model/scopeMetrics";

export function useReportsOverview() {
  const { catalog, error: catalogError, isLoading: isCatalogLoading, scope } = useWorkingContext();
  const { error: operationsError, isLoading: isOperationsLoading, operations } = useOperations();

  const report = useMemo(() => {
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
      enrolledCount: sumEnrolledCount(activities),
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
