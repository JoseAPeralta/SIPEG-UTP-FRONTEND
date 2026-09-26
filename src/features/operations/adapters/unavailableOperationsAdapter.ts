import type { OperationsAdapter } from "@/app/adapters/contracts";

export const OPERATIONS_CONTRACT_PENDING_MESSAGE =
  "Asistencia, certificados, ponentes y reportes aun no tienen contrato OpenAPI en el backend.";

export function createUnavailableOperationsAdapter(): OperationsAdapter {
  return {
    loadOperations: () => Promise.reject(new Error(OPERATIONS_CONTRACT_PENDING_MESSAGE)),
  };
}
