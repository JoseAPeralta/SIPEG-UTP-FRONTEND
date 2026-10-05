import type { RegistrationAdapter } from "@/app/adapters/contracts";

export function createMockRegistrationAdapter(): RegistrationAdapter {
  return {
    register: () => Promise.resolve({ userId: "registered-user" }),
  };
}
