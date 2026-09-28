import type { ActivityCatalogAdapter } from "@/app/adapters/contracts";
import { mockActivityCatalog } from "@/data/mock";

import { assertCatalogIntegrity } from "../model/catalogIntegrity";

export function createMockActivityCatalogAdapter(): ActivityCatalogAdapter {
  return {
    loadCatalog: () => {
      assertCatalogIntegrity(mockActivityCatalog);

      return Promise.resolve(structuredClone(mockActivityCatalog));
    },
  };
}
