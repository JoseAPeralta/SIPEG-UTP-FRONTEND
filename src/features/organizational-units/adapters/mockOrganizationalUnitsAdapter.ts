import type { OrganizationalUnitsAdapter } from "@/app/adapters/contracts";
import { organizationalUnits } from "@/data/mock";

export function createMockOrganizationalUnitsAdapter(): OrganizationalUnitsAdapter {
  return {
    loadOrganizationalUnits: () => Promise.resolve(structuredClone(organizationalUnits)),
  };
}
