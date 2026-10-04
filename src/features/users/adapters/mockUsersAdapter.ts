import type { UsersAdapter } from "@/app/adapters/contracts";
import { users } from "@/data/mock/users";

export function createMockUsersAdapter(): UsersAdapter {
  return {
    loadUsers: () => Promise.resolve(structuredClone(users)),
  };
}
