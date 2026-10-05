import { useMemo } from "react";

import { useOperations } from "@/features/operations";
import { countGeneratedCertificates, filterCertificatesByScope } from "@/features/reports";
import { useUsers } from "@/features/users";
import { useWorkingContext } from "@/features/working-context";

export function useCertificatesOverview() {
  const { catalog, error: catalogError, isLoading: isCatalogLoading, scope } = useWorkingContext();
  const { error: operationsError, isLoading: isOperationsLoading, operations } = useOperations();
  const { error: usersError, isLoading: isUsersLoading, users } = useUsers();

  const certificates = useMemo(() => {
    if (!operations || !scope) {
      return [];
    }

    return filterCertificatesByScope(operations.certificates, scope.activityIds);
  }, [operations, scope]);

  const rows = useMemo(() => {
    const activityById = new Map(
      (catalog?.activities ?? []).map((activity) => [activity.id, activity]),
    );
    const userById = new Map((users ?? []).map((user) => [user.id, user]));

    return certificates.map((certificate) => {
      const user = userById.get(certificate.userId);

      return {
        activityName: activityById.get(certificate.activityId)?.name ?? null,
        certificate,
        userName: user ? `${user.firstName} ${user.lastName}` : null,
      };
    });
  }, [catalog, certificates, users]);

  return {
    error: catalogError ?? operationsError ?? usersError,
    generatedCount: countGeneratedCertificates(certificates),
    isLoading: isCatalogLoading || isOperationsLoading || isUsersLoading,
    rows,
    scope,
  };
}
