import { useMemo } from "react";

import { useUsers } from "./useUsers";

export function useUsersOverview() {
  const { error, isLoading, users } = useUsers();

  const rows = useMemo(
    () =>
      (users ?? []).map((user) => ({
        careerName: user.career?.name ?? null,
        unitLabel: user.unit?.code ?? user.unit?.name ?? null,
        user,
      })),
    [users],
  );

  return { error, isLoading, rows };
}
