import type { ActivityCatalogAdapter } from "@/app/adapters/contracts";
import { mockActivityCatalog } from "@/data/mock";

export function createMockActivityCatalogAdapter(): ActivityCatalogAdapter {
  return {
    loadCatalog: () =>
      Promise.resolve(
        structuredClone({
          activities: mockActivityCatalog.activities,
          eventPrograms: mockActivityCatalog.eventPrograms,
        }),
      ),
  };
}
