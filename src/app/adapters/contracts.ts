import type { ActivityCatalog, OperationsReadModel } from "@/types/domain";

export type ActivityCatalogAdapter = {
  loadCatalog: () => Promise<ActivityCatalog>;
};

export type OperationsAdapter = {
  loadOperations: () => Promise<OperationsReadModel>;
};

export type AppAdapters = {
  activityCatalog: ActivityCatalogAdapter;
  operations: OperationsAdapter;
};
