import type { RegistrationAdapter } from "@/app/adapters/contracts";
import { mockActivityCatalog, mockOperationsReadModel } from "@/data/mock";

export function createMockRegistrationAdapter(): RegistrationAdapter {
  return {
    loadCatalog: () =>
      Promise.resolve({
        careers: mockOperationsReadModel.careers,
        organizationalUnits: mockActivityCatalog.organizationalUnits,
      }),
    register: () => Promise.resolve({ userId: "registered-user" }),
  };
}
