import type { OperationsAdapter } from "@/app/adapters/contracts";
import { mockOperationsReadModel } from "@/data/mock/operationsReadModel";

export function createMockOperationsAdapter(): OperationsAdapter {
  return {
    loadOperations: () => Promise.resolve(mockOperationsReadModel),
  };
}
