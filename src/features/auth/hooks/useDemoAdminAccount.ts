import { useOperations } from "@/features/operations";

export function useDemoAdminAccount() {
  const { isLoading, operations } = useOperations();

  return {
    account: operations?.users.find((user) => user.globalRole === "ADMIN") ?? null,
    isLoading,
  };
}
