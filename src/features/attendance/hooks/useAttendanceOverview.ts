import { useMemo } from "react";

import { useOperations } from "@/features/operations";
import {
  countConfirmedAttendance,
  countQrAttendance,
  filterAttendanceByScope,
} from "@/features/reports";
import { useWorkingContext } from "@/features/working-context";

export function useAttendanceOverview() {
  const { catalog, error: catalogError, isLoading: isCatalogLoading, scope } = useWorkingContext();
  const { error: operationsError, isLoading: isOperationsLoading, operations } = useOperations();

  const records = useMemo(() => {
    if (!operations || !scope) {
      return [];
    }

    return filterAttendanceByScope(operations.attendanceRecords, scope.activityIds);
  }, [operations, scope]);

  const activities = useMemo(() => {
    if (!catalog || !scope) {
      return [];
    }

    const scopedActivityIds = new Set(scope.activityIds);

    return catalog.activities.filter((activity) => scopedActivityIds.has(activity.id));
  }, [catalog, scope]);

  return {
    activities,
    error: catalogError ?? operationsError,
    isLoading: isCatalogLoading || isOperationsLoading,
    presentCount: countConfirmedAttendance(records),
    qrCount: countQrAttendance(records),
    records,
    scope,
  };
}
